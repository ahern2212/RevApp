import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';

import { Avatar } from '@/components/Avatar';
import { GlassBackdrop } from '@/components/GlassBackdrop';
import Colors from '@/constants/Colors';
import { useGarage } from '@/context/GarageContext';
import { useMessages } from '@/context/MessagesContext';
import { timeAgo } from '@/lib/time';

/** Inbox: your chats, newest first, with an unread dot. */
export default function InboxScreen() {
  const router = useRouter();
  const { user } = useGarage();
  const { conversations, unavailable, refresh } = useMessages();
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };

  return (
    <View style={styles.screen}>
      <GlassBackdrop />
      <FlatList
        style={styles.list}
        contentContainerStyle={styles.content}
        data={conversations ?? []}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.light.tint} />
        }
        ListEmptyComponent={
          unavailable ? (
            <Text style={styles.empty}>Messages need the latest database update.</Text>
          ) : conversations === null ? (
            <ActivityIndicator color={Colors.light.tint} style={styles.loading} />
          ) : (
            <View style={styles.emptyBox}>
              <Ionicons name="paper-plane-outline" size={40} color={Colors.light.tint} />
              <Text style={styles.emptyTitle}>No messages yet</Text>
              <Text style={styles.empty}>
                Start a chat from a driver’s profile, or tap “Message seller” on a market listing.
              </Text>
            </View>
          )
        }
        renderItem={({ item }) => (
          <Pressable
            onPress={() =>
              router.push({
                pathname: '/messages/[conversationId]',
                params: { conversationId: item.id, name: item.partnerName },
              })
            }
            accessibilityRole="button"
            accessibilityLabel={`Chat with ${item.partnerName}${item.unread ? ', unread' : ''}`}
            style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
            <Avatar name={item.partnerName} userId={item.partnerId} size={48} />
            <View style={styles.text}>
              <Text style={[styles.name, item.unread && styles.unreadText]} numberOfLines={1}>
                {item.partnerName}
              </Text>
              <Text style={[styles.preview, item.unread && styles.unreadText]} numberOfLines={1}>
                {item.lastSenderId === user?.id ? 'You: ' : ''}
                {item.lastMessage}
                {item.lastMessageAt ? ` · ${timeAgo(item.lastMessageAt)}` : ''}
              </Text>
            </View>
            {item.unread ? <View style={styles.dot} /> : null}
          </Pressable>
        )}
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
    paddingVertical: 8,
    maxWidth: 640,
    width: '100%',
    alignSelf: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  pressed: {
    backgroundColor: Colors.light.card,
  },
  text: {
    flex: 1,
    gap: 2,
  },
  name: {
    color: Colors.light.text,
    fontWeight: '600',
    fontSize: 15,
  },
  preview: {
    color: Colors.light.muted,
  },
  unreadText: {
    color: Colors.light.text,
    fontWeight: '800',
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.light.tint,
  },
  loading: {
    marginTop: 48,
  },
  emptyBox: {
    alignItems: 'center',
    gap: 8,
    marginTop: 48,
    paddingHorizontal: 24,
  },
  emptyTitle: {
    color: Colors.light.text,
    fontSize: 17,
    fontWeight: '800',
  },
  empty: {
    color: Colors.light.muted,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 24,
  },
});
