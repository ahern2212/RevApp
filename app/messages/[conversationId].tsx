import Ionicons from '@expo/vector-icons/Ionicons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
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
import { OptionsSheet, type SheetOption } from '@/components/OptionsSheet';
import { confirmBlock, useReportSheet } from '@/components/SafetyActions';
import Colors from '@/constants/Colors';
import { glass } from '@/constants/glass';
import { useGarage } from '@/context/GarageContext';
import { useMessages } from '@/context/MessagesContext';
import { showTimeAbove } from '@/lib/chat';
import { confirm, showError } from '@/lib/confirm';
import {
  type Conversation,
  fetchConversation,
  fetchMessages,
  markConversationRead,
  type Message,
  MESSAGE_MAX,
  sendMessage,
  subscribeToMessages,
  unsendMessage,
} from '@/lib/messages';

type Thread = { messages: Message[]; cursor: string | null; hasMore: boolean };

function formatStamp(at: number): string {
  const date = new Date(at);
  const sameDay = new Date().toDateString() === date.toDateString();
  const time = date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  return sameDay ? time : `${date.toLocaleDateString([], { month: 'short', day: 'numeric' })}, ${time}`;
}

/** One chat: newest messages at the bottom, live updates, and a composer. */
export default function ChatScreen() {
  const { conversationId, name, draft: initialDraft } = useLocalSearchParams<{
    conversationId: string;
    name?: string;
    draft?: string;
  }>();
  const router = useRouter();
  const { bottom } = useSafeAreaInsets();
  const { user } = useGarage();
  const { markReadLocally, refresh: refreshInbox } = useMessages();
  const myId = user?.id;
  const [chat, setChat] = useState<Conversation | null>(null);
  const [thread, setThread] = useState<Thread | null>(null);
  const [failed, setFailed] = useState<string | null>(null);
  const [draft, setDraft] = useState(initialDraft ?? '');
  const [sending, setSending] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [menu, setMenu] = useState<SheetOption[] | null>(null);
  const partnerName = chat?.partnerName ?? name ?? 'Chat';

  const markRead = useCallback(() => {
    markReadLocally(conversationId);
    markConversationRead(conversationId).catch((error) => console.warn('Failed to mark chat read', error));
  }, [conversationId, markReadLocally]);

  // Adds messages we don't have yet, newest first (the list is inverted).
  const addMessages = useCallback((incoming: Message[]) => {
    setThread((current) => {
      const existing = current?.messages ?? [];
      const seen = new Set(existing.map((message) => message.id));
      const fresh = incoming.filter((message) => !seen.has(message.id));
      if (fresh.length === 0) return current;
      const messages = [...fresh, ...existing].sort((a, b) => b.createdAt - a.createdAt);
      return { cursor: current?.cursor ?? null, hasMore: current?.hasMore ?? false, messages };
    });
  }, []);

  useEffect(() => {
    if (!myId) return;
    let cancelled = false;
    Promise.all([fetchConversation(conversationId, myId), fetchMessages(conversationId)])
      .then(([nextChat, page]) => {
        if (cancelled) return;
        setChat(nextChat);
        setThread(page);
        markRead();
      })
      .catch((error: Error) => !cancelled && setFailed(error.message));

    const unsubscribe = subscribeToMessages(conversationId, (message) => {
      addMessages([message]);
      if (message.senderId !== myId) markRead();
    });
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [conversationId, myId, addMessages, markRead]);

  const loadOlder = async () => {
    if (!thread?.hasMore || loadingOlder) return;
    setLoadingOlder(true);
    try {
      const page = await fetchMessages(conversationId, thread.cursor);
      setThread((current) =>
        current
          ? { messages: [...current.messages, ...page.messages], cursor: page.cursor, hasMore: page.hasMore }
          : page
      );
    } catch (error) {
      console.warn('Failed to load older messages', error);
    } finally {
      setLoadingOlder(false);
    }
  };

  const send = async () => {
    const body = draft.trim();
    if (!body || sending) return;
    setSending(true);
    try {
      addMessages([await sendMessage(conversationId, body)]);
      setDraft('');
      refreshInbox();
    } catch (error) {
      showError('Could not send', error);
    } finally {
      setSending(false);
    }
  };

  const unsend = async (message: Message) => {
    if (!(await confirm('Unsend message?', 'It will be removed from the chat.', 'Unsend'))) return;
    try {
      await unsendMessage(message.id);
      setThread((current) =>
        current ? { ...current, messages: current.messages.filter((m) => m.id !== message.id) } : current
      );
      refreshInbox();
    } catch (error) {
      showError('Could not unsend', error);
    }
  };

  const { openReport, reportSheet } = useReportSheet((target) =>
    setThread((current) =>
      current ? { ...current, messages: current.messages.filter((m) => m.id !== target.id) } : current
    )
  );

  const openMenu = (message: Message) => {
    if (!chat) return;
    setMenu(
      message.senderId === myId
        ? [{ label: 'Unsend', icon: 'arrow-undo-outline', destructive: true, onPress: () => unsend(message) }]
        : [
            {
              label: 'Report message',
              icon: 'flag-outline',
              destructive: true,
              onPress: () => openReport({ kind: 'message', id: message.id }),
            },
            {
              label: `Block @${chat.partnerName}`,
              icon: 'ban-outline',
              destructive: true,
              onPress: async () => {
                if (await confirmBlock(chat.partnerId, chat.partnerName)) {
                  refreshInbox();
                  router.back();
                }
              },
            },
          ]
    );
  };

  const openProfile = () =>
    chat && router.push({ pathname: '/user/[userId]', params: { userId: chat.partnerId, name: chat.partnerName } });

  const canSend = draft.trim().length > 0 && !sending;
  const messages = thread?.messages ?? [];

  return (
    <KeyboardAvoidingView
      style={styles.wrap}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}>
      <Stack.Screen
        options={{
          title: partnerName,
          headerRight: () =>
            chat ? (
              <Pressable
                onPress={openProfile}
                hitSlop={8}
                accessibilityRole="link"
                accessibilityLabel={`View ${chat.partnerName}'s profile`}>
                <Avatar name={chat.partnerName} userId={chat.partnerId} size={30} />
              </Pressable>
            ) : null,
        }}
      />
      {failed ? (
        <Text style={styles.notice}>{failed}</Text>
      ) : !thread ? (
        <ActivityIndicator color={Colors.light.tint} style={styles.loading} />
      ) : (
        <FlatList
          inverted
          data={messages}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          keyboardShouldPersistTaps="handled"
          onEndReached={loadOlder}
          onEndReachedThreshold={0.4}
          ListFooterComponent={loadingOlder ? <ActivityIndicator color={Colors.light.tint} /> : null}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Avatar name={partnerName} userId={chat?.partnerId} size={64} />
              <Text style={styles.emptyTitle}>{partnerName}</Text>
              <Text style={styles.emptyText}>Say hi 👋 Be respectful: blocking ends a chat for both of you.</Text>
            </View>
          }
          renderItem={({ item, index }) => {
            const mine = item.senderId === myId;
            // Inverted list: the next item in the array is the older message.
            const older = messages[index + 1];
            return (
              <View>
                {showTimeAbove(older?.createdAt ?? null, item.createdAt) ? (
                  <Text style={styles.stamp}>{formatStamp(item.createdAt)}</Text>
                ) : null}
                <Pressable
                  onLongPress={() => openMenu(item)}
                  delayLongPress={300}
                  accessibilityHint={mine ? 'Long-press to unsend' : 'Long-press to report or block'}
                  style={[styles.bubble, mine ? styles.mine : styles.theirs]}>
                  <Text style={[styles.body, mine && styles.mineText]} selectable>
                    {item.body}
                  </Text>
                </Pressable>
              </View>
            );
          }}
        />
      )}
      <View style={[styles.composer, { paddingBottom: bottom + 10 }]}>
        <TextInput
          value={draft}
          onChangeText={setDraft}
          placeholder="Message…"
          placeholderTextColor={Colors.light.placeholder}
          maxLength={MESSAGE_MAX}
          multiline
          accessibilityLabel="Write a message"
          style={styles.input}
        />
        <Pressable
          onPress={send}
          disabled={!canSend}
          accessibilityRole="button"
          accessibilityLabel="Send message"
          style={[styles.send, !canSend && styles.sendDisabled]}>
          {sending ? (
            <ActivityIndicator color={Colors.light.onTint} size="small" />
          ) : (
            <Ionicons name="arrow-up" size={20} color={Colors.light.onTint} />
          )}
        </Pressable>
      </View>
      <OptionsSheet visible={menu !== null} options={menu ?? []} onClose={() => setMenu(null)} />
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
  notice: {
    color: Colors.light.muted,
    textAlign: 'center',
    marginTop: 48,
    paddingHorizontal: 24,
  },
  list: {
    padding: 12,
    gap: 6,
    maxWidth: 640,
    width: '100%',
    alignSelf: 'center',
    flexGrow: 1,
  },
  stamp: {
    color: Colors.light.muted,
    fontSize: 12,
    textAlign: 'center',
    marginVertical: 8,
  },
  bubble: {
    maxWidth: '78%',
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  mine: {
    alignSelf: 'flex-end',
    backgroundColor: Colors.light.tint,
    borderBottomRightRadius: 6,
  },
  theirs: {
    ...glass,
    shadowOpacity: 0,
    alignSelf: 'flex-start',
    borderBottomLeftRadius: 6,
  },
  body: {
    color: Colors.light.text,
    fontSize: 15,
    lineHeight: 20,
  },
  mineText: {
    color: Colors.light.onTint,
  },
  empty: {
    alignItems: 'center',
    gap: 8,
    paddingVertical: 32,
  },
  emptyTitle: {
    color: Colors.light.text,
    fontSize: 18,
    fontWeight: '800',
  },
  emptyText: {
    color: Colors.light.muted,
    textAlign: 'center',
    paddingHorizontal: 24,
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
