import Ionicons from '@expo/vector-icons/Ionicons';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { Avatar } from '@/components/Avatar';
import { SharedPost } from '@/components/SharedPost';
import Colors from '@/constants/Colors';
import { glass } from '@/constants/glass';
import { useGarage } from '@/context/GarageContext';
import { useMessages } from '@/context/MessagesContext';
import { showError } from '@/lib/confirm';
import { fetchFollowList } from '@/lib/follows';
import { MESSAGE_MAX, sendMessage, startConversation } from '@/lib/messages';

type Person = { id: string; username: string; conversationId: string | null };
type SendState = 'sending' | 'sent';

/** "Send to…": your chats first, then people you follow. One tap sends the post. */
export default function SendPostScreen() {
  const { postId } = useLocalSearchParams<{ postId: string }>();
  const { user } = useGarage();
  const { conversations, refresh } = useMessages();
  const [following, setFollowing] = useState<{ id: string; username: string }[]>([]);
  const [query, setQuery] = useState('');
  const [note, setNote] = useState('');
  const [status, setStatus] = useState<Record<string, SendState>>({});
  const myId = user?.id;

  useEffect(() => {
    if (!myId) return;
    let cancelled = false;
    fetchFollowList(myId, 'following')
      .then((people) => !cancelled && setFollowing(people))
      .catch((error) => console.warn('Failed to load who you follow', error));
    return () => {
      cancelled = true;
    };
  }, [myId]);

  // Recent chats first, then followed drivers you haven't messaged yet.
  const chats: Person[] = (conversations ?? []).map((chat) => ({
    id: chat.partnerId,
    username: chat.partnerName,
    conversationId: chat.id,
  }));
  const chatted = new Set(chats.map((person) => person.id));
  const people = [
    ...chats,
    ...following.filter((person) => !chatted.has(person.id)).map((person) => ({ ...person, conversationId: null })),
  ];
  const needle = query.trim().toLowerCase();
  const shown = needle ? people.filter((person) => person.username.includes(needle)) : people;

  const send = async (person: Person) => {
    setStatus((current) => ({ ...current, [person.id]: 'sending' }));
    try {
      const conversationId = person.conversationId ?? (await startConversation(person.id));
      await sendMessage(conversationId, note, postId);
      setStatus((current) => ({ ...current, [person.id]: 'sent' }));
      refresh();
    } catch (error) {
      setStatus((current) => {
        const next = { ...current };
        delete next[person.id];
        return next;
      });
      showError('Could not send', error);
    }
  };

  return (
    <View style={styles.screen}>
      <FlatList
        style={styles.list}
        contentContainerStyle={styles.content}
        data={shown}
        keyExtractor={(item) => item.id}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={
          <View style={styles.header}>
            <View style={styles.preview}>
              <SharedPost postId={postId} />
            </View>
            <TextInput
              value={note}
              onChangeText={setNote}
              placeholder="Add a message (optional)"
              placeholderTextColor={Colors.light.placeholder}
              maxLength={MESSAGE_MAX}
              accessibilityLabel="Message to send with the post"
              style={styles.input}
            />
            <View style={styles.search}>
              <Ionicons name="search" size={16} color={Colors.light.muted} />
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder="Search"
                placeholderTextColor={Colors.light.placeholder}
                autoCapitalize="none"
                autoCorrect={false}
                accessibilityLabel="Search people"
                style={styles.searchInput}
              />
            </View>
          </View>
        }
        ListEmptyComponent={
          conversations === null ? (
            <ActivityIndicator color={Colors.light.tint} style={styles.loading} />
          ) : (
            <Text style={styles.empty}>
              {needle ? `No one called “${query.trim()}”.` : 'Follow drivers or start a chat to send them posts.'}
            </Text>
          )
        }
        renderItem={({ item }) => {
          const state = status[item.id];
          return (
            <View style={styles.row}>
              <Avatar name={item.username} userId={item.id} size={40} />
              <Text style={styles.username} numberOfLines={1}>
                {item.username}
              </Text>
              <Pressable
                onPress={() => send(item)}
                disabled={!!state}
                accessibilityRole="button"
                accessibilityLabel={state === 'sent' ? `Sent to ${item.username}` : `Send to ${item.username}`}
                style={[styles.send, state === 'sent' && styles.sent]}>
                {state === 'sending' ? (
                  <ActivityIndicator size="small" color={Colors.light.onTint} />
                ) : (
                  <Text style={[styles.sendText, state === 'sent' && styles.sentText]}>
                    {state === 'sent' ? 'Sent' : 'Send'}
                  </Text>
                )}
              </Pressable>
            </View>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  list: {
    flex: 1,
  },
  content: {
    paddingBottom: 32,
    maxWidth: 640,
    width: '100%',
    alignSelf: 'center',
  },
  header: {
    padding: 16,
    gap: 12,
  },
  preview: {
    alignItems: 'center',
  },
  input: {
    ...glass,
    shadowOpacity: 0,
    color: Colors.light.text,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
  },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 12,
    paddingHorizontal: 12,
    backgroundColor: Colors.light.card,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  searchInput: {
    flex: 1,
    color: Colors.light.text,
    paddingVertical: 8,
    fontSize: 15,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  username: {
    flex: 1,
    color: Colors.light.text,
    fontWeight: '700',
  },
  send: {
    minWidth: 72,
    alignItems: 'center',
    backgroundColor: Colors.light.tint,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  sent: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  sendText: {
    color: Colors.light.onTint,
    fontWeight: '800',
  },
  sentText: {
    color: Colors.light.muted,
  },
  loading: {
    marginTop: 24,
  },
  empty: {
    color: Colors.light.muted,
    textAlign: 'center',
    marginTop: 24,
    paddingHorizontal: 24,
  },
});
