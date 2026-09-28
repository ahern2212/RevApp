import Ionicons from '@expo/vector-icons/Ionicons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Avatar } from '@/components/Avatar';
import { RichText } from '@/components/RichText';
import { useReportSheet } from '@/components/SafetyActions';
import Colors from '@/constants/Colors';
import { useGarage } from '@/context/GarageContext';
import { confirm, showError } from '@/lib/confirm';
import {
  addReply,
  CATEGORY_ICONS,
  deleteReply,
  deleteThread,
  fetchThread,
  type ForumReply,
  type ForumThread,
  REPLY_MAX,
} from '@/lib/forums';
import { timeAgo } from '@/lib/time';

type Loaded = { id: string; thread: ForumThread; replies: ForumReply[] } | { id: string; thread: null };

export default function ThreadScreen() {
  const { threadId } = useLocalSearchParams<{ threadId: string }>();
  const router = useRouter();
  const { user } = useGarage();
  const { bottom } = useSafeAreaInsets();
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const current = loaded?.id === threadId ? loaded : null;
  const { openReport, reportSheet } = useReportSheet((target) => {
    if (target.kind === 'thread') {
      router.back();
      return;
    }
    setLoaded((prev) =>
      prev && prev.thread !== null
        ? { ...prev, replies: prev.replies.filter((reply) => reply.id !== target.id) }
        : prev
    );
  });

  useEffect(() => {
    let cancelled = false;
    fetchThread(threadId)
      .then((result) => {
        if (cancelled) return;
        setLoaded(result ? { id: threadId, ...result } : { id: threadId, thread: null });
      })
      .catch((error) => {
        console.warn('Failed to load thread', error);
        if (!cancelled) setLoaded({ id: threadId, thread: null });
      });
    return () => {
      cancelled = true;
    };
  }, [threadId]);

  if (!current) {
    return (
      <View style={styles.wrap}>
        <ActivityIndicator color={Colors.light.tint} style={styles.loading} />
      </View>
    );
  }
  if (!current.thread) {
    return (
      <View style={styles.wrap}>
        <Text style={styles.missing}>This thread was deleted or couldn’t be loaded.</Text>
      </View>
    );
  }

  const { thread, replies } = current;
  const openProfile = (userId: string, name: string) =>
    router.push({ pathname: '/user/[userId]', params: { userId, name } });

  const send = async () => {
    const body = draft.trim();
    if (!body || sending) return;
    setSending(true);
    try {
      const reply = await addReply(thread.id, body);
      setLoaded({ id: thread.id, thread, replies: [...replies, reply] });
      setDraft('');
    } catch (error) {
      showError('Could not reply', error);
    } finally {
      setSending(false);
    }
  };

  const removeReply = async (replyId: string) => {
    if (!(await confirm('Delete reply?', 'This can’t be undone.', 'Delete'))) return;
    try {
      await deleteReply(replyId);
      setLoaded({ id: thread.id, thread, replies: replies.filter((r) => r.id !== replyId) });
    } catch (error) {
      showError('Could not delete', error);
    }
  };

  const removeThread = async () => {
    const ok = await confirm('Delete this thread?', 'All replies will be removed too.', 'Delete');
    if (!ok) return;
    try {
      await deleteThread(thread.id);
      router.back();
    } catch (error) {
      showError('Could not delete', error);
    }
  };

  const canSend = draft.trim().length > 0 && !sending;

  return (
    <KeyboardAvoidingView
      style={styles.wrap}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}>
      <Stack.Screen options={{ title: thread.category }} />
      <FlatList
        data={replies}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={
          <View style={styles.op}>
            <View style={styles.categoryPill}>
              <Ionicons name={CATEGORY_ICONS[thread.category]} size={12} color={Colors.light.tint} />
              <Text style={styles.categoryText}>{thread.category}</Text>
            </View>
            <Text style={styles.title}>{thread.title}</Text>
            <Pressable
              onPress={() => openProfile(thread.authorId, thread.authorName)}
              accessibilityRole="link"
              style={styles.byline}>
              <Avatar name={thread.authorName} userId={thread.authorId} size={28} />
              <Text style={styles.author}>{thread.authorName}</Text>
              <Text style={styles.time}>· {timeAgo(thread.createdAt)}</Text>
            </Pressable>
            {thread.body ? (
              <Text style={styles.body}>
                <RichText text={thread.body} />
              </Text>
            ) : null}
            <View style={styles.opFooter}>
              <Text style={styles.replyCount}>
                {replies.length} {replies.length === 1 ? 'reply' : 'replies'}
              </Text>
              {thread.authorId === user?.id ? (
                <Pressable onPress={removeThread} accessibilityRole="button" style={styles.deleteThread}>
                  <Ionicons name="trash-outline" size={15} color={Colors.light.danger} />
                  <Text style={styles.deleteText}>Delete thread</Text>
                </Pressable>
              ) : (
                <Pressable
                  onPress={() => openReport({ kind: 'thread', id: thread.id })}
                  accessibilityRole="button"
                  style={styles.deleteThread}>
                  <Ionicons name="flag-outline" size={15} color={Colors.light.muted} />
                  <Text style={styles.reportText}>Report</Text>
                </Pressable>
              )}
            </View>
          </View>
        }
        ListEmptyComponent={<Text style={styles.noReplies}>No replies yet — be the first.</Text>}
        renderItem={({ item }) => (
          <View style={styles.reply}>
            <Pressable
              onPress={() => openProfile(item.authorId, item.authorName)}
              accessibilityRole="link"
              accessibilityLabel={`View ${item.authorName}'s profile`}>
              <Avatar name={item.authorName} userId={item.authorId} size={32} />
            </Pressable>
            <View style={styles.replyBody}>
              <Text style={styles.replyAuthor}>
                {item.authorName} <Text style={styles.time}>· {timeAgo(item.createdAt)}</Text>
              </Text>
              <Text style={styles.replyText}>
                <RichText text={item.body} />
              </Text>
            </View>
            {item.authorId === user?.id ? (
              <Pressable
                onPress={() => removeReply(item.id)}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="Delete reply">
                <Ionicons name="trash-outline" size={16} color={Colors.light.muted} />
              </Pressable>
            ) : (
              <Pressable
                onPress={() => openReport({ kind: 'reply', id: item.id })}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="Report reply">
                <Ionicons name="flag-outline" size={15} color={Colors.light.muted} />
              </Pressable>
            )}
          </View>
        )}
      />
      <View style={[styles.composer, { paddingBottom: bottom + 10 }]}>
        <TextInput
          value={draft}
          onChangeText={setDraft}
          placeholder="Write a reply…"
          placeholderTextColor={Colors.light.placeholder}
          maxLength={REPLY_MAX}
          multiline
          accessibilityLabel="Write a reply"
          style={styles.input}
        />
        <Pressable
          onPress={send}
          disabled={!canSend}
          accessibilityRole="button"
          accessibilityLabel="Post reply"
          style={[styles.send, !canSend && styles.sendDisabled]}>
          {sending ? (
            <ActivityIndicator color={Colors.light.onTint} size="small" />
          ) : (
            <Ionicons name="arrow-up" size={20} color={Colors.light.onTint} />
          )}
        </Pressable>
      </View>
      {reportSheet}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  loading: {
    marginTop: 48,
  },
  missing: {
    color: Colors.light.muted,
    textAlign: 'center',
    marginTop: 48,
    paddingHorizontal: 24,
  },
  list: {
    padding: 16,
    gap: 14,
    maxWidth: 640,
    width: '100%',
    alignSelf: 'center',
  },
  op: {
    gap: 10,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.light.border,
  },
  categoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    backgroundColor: Colors.light.avatar,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  categoryText: {
    color: Colors.light.text,
    fontSize: 12,
    fontWeight: '700',
  },
  title: {
    color: Colors.light.text,
    fontSize: 22,
    fontWeight: '900',
  },
  byline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  author: {
    color: Colors.light.text,
    fontWeight: '700',
  },
  time: {
    color: Colors.light.muted,
    fontWeight: '400',
    fontSize: 12,
  },
  body: {
    color: Colors.light.text,
    lineHeight: 22,
    fontSize: 15,
  },
  opFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  replyCount: {
    color: Colors.light.muted,
    fontWeight: '700',
  },
  deleteThread: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  deleteText: {
    color: Colors.light.danger,
    fontWeight: '700',
    fontSize: 13,
  },
  reportText: {
    color: Colors.light.muted,
    fontWeight: '700',
    fontSize: 13,
  },
  noReplies: {
    color: Colors.light.muted,
    textAlign: 'center',
    marginTop: 16,
  },
  reply: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  replyBody: {
    flex: 1,
    gap: 2,
  },
  replyAuthor: {
    color: Colors.light.text,
    fontWeight: '700',
  },
  replyText: {
    color: Colors.light.text,
    lineHeight: 20,
  },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.light.border,
    backgroundColor: Colors.light.background,
  },
  input: {
    flex: 1,
    maxHeight: 120,
    borderWidth: 1,
    borderColor: Colors.light.border,
    backgroundColor: Colors.light.card,
    color: Colors.light.text,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 10,
    fontSize: 16,
  },
  send: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.light.tint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendDisabled: {
    opacity: 0.4,
  },
});
