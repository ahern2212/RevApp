import Ionicons from '@expo/vector-icons/Ionicons';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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

import Colors from '@/constants/Colors';
import { useGarage } from '@/context/GarageContext';
import {
  addComment,
  type Comment,
  COMMENT_MAX_LENGTH,
  deleteComment,
  fetchComments,
} from '@/lib/comments';
import { timeAgo } from '@/lib/time';

function CommentRow({
  name,
  body,
  createdAt,
  onDelete,
}: {
  name: string;
  body: string;
  createdAt: number;
  onDelete?: () => void;
}) {
  return (
    <View style={styles.row}>
      <View style={styles.avatar}>
        <Text style={styles.avatarLetter}>{name.slice(0, 1).toUpperCase()}</Text>
      </View>
      <View style={styles.rowBody}>
        <Text style={styles.body}>
          <Text style={styles.username}>{name} </Text>
          {body}
        </Text>
        <Text style={styles.meta}>{timeAgo(createdAt)}</Text>
      </View>
      {onDelete ? (
        <Pressable
          onPress={onDelete}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Delete comment">
          <Ionicons name="trash-outline" size={18} color={Colors.light.muted} />
        </Pressable>
      ) : null}
    </View>
  );
}

export default function CommentsScreen() {
  const { postId } = useLocalSearchParams<{ postId: string }>();
  const { posts, user, adjustCommentCount } = useGarage();
  const { bottom } = useSafeAreaInsets();
  const post = posts.find((p) => p.id === postId);

  const [comments, setComments] = useState<Comment[] | null>(null);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetchComments(postId)
      .then((list) => !cancelled && setComments(list))
      .catch((error) => {
        console.warn('Failed to load comments', error);
        if (!cancelled) setComments([]);
      });
    return () => {
      cancelled = true;
    };
  }, [postId]);

  const send = async () => {
    const body = draft.trim();
    if (!body || sending) return;
    setSending(true);
    try {
      const comment = await addComment(postId, body);
      setComments((current) => [...(current ?? []), comment]);
      adjustCommentCount(postId, 1);
      setDraft('');
    } catch (error) {
      Alert.alert('Could not comment', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setSending(false);
    }
  };

  const remove = async (commentId: string) => {
    try {
      await deleteComment(commentId);
      setComments((current) => (current ?? []).filter((c) => c.id !== commentId));
      adjustCommentCount(postId, -1);
    } catch (error) {
      Alert.alert('Could not delete', error instanceof Error ? error.message : 'Please try again.');
    }
  };

  const canSend = draft.trim().length > 0 && !sending;

  return (
    <KeyboardAvoidingView
      style={styles.wrap}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}>
      <FlatList
        data={comments ?? []}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={
          post?.caption ? (
            <View style={styles.captionBlock}>
              <CommentRow name={post.authorName} body={post.caption} createdAt={post.createdAt} />
            </View>
          ) : null
        }
        ListEmptyComponent={
          comments === null ? (
            <ActivityIndicator color={Colors.light.tint} style={styles.loading} />
          ) : (
            <View style={styles.empty}>
              <Ionicons name="car-sport-outline" size={36} color={Colors.light.tint} />
              <Text style={styles.emptyText}>No comments yet. Start the conversation.</Text>
            </View>
          )
        }
        renderItem={({ item }) => (
          <CommentRow
            name={item.authorName}
            body={item.body}
            createdAt={item.createdAt}
            onDelete={item.authorId === user?.id ? () => remove(item.id) : undefined}
          />
        )}
      />
      <View style={[styles.composer, { paddingBottom: bottom + 10 }]}>
        <TextInput
          value={draft}
          onChangeText={setDraft}
          placeholder={`Comment as ${user?.username ?? 'you'}…`}
          placeholderTextColor={Colors.light.placeholder}
          maxLength={COMMENT_MAX_LENGTH}
          multiline
          accessibilityLabel="Write a comment"
          style={styles.input}
        />
        <Pressable
          onPress={send}
          disabled={!canSend}
          accessibilityRole="button"
          accessibilityLabel="Post comment"
          style={[styles.send, !canSend && styles.sendDisabled]}>
          {sending ? (
            <ActivityIndicator color={Colors.light.onTint} size="small" />
          ) : (
            <Ionicons name="arrow-up" size={20} color={Colors.light.onTint} />
          )}
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  list: {
    padding: 16,
    gap: 16,
    maxWidth: 640,
    width: '100%',
    alignSelf: 'center',
    flexGrow: 1,
  },
  captionBlock: {
    paddingBottom: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.light.border,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.light.avatar,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLetter: {
    color: Colors.light.text,
    fontWeight: '700',
  },
  rowBody: {
    flex: 1,
  },
  username: {
    color: Colors.light.text,
    fontWeight: '700',
  },
  body: {
    color: Colors.light.text,
    lineHeight: 20,
  },
  meta: {
    color: Colors.light.muted,
    fontSize: 12,
    marginTop: 4,
  },
  loading: {
    marginTop: 32,
  },
  empty: {
    alignItems: 'center',
    gap: 10,
    marginTop: 48,
  },
  emptyText: {
    color: Colors.light.muted,
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
