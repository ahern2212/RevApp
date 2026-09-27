import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { Avatar } from '@/components/Avatar';
import { GlassBackdrop } from '@/components/GlassBackdrop';
import Colors from '@/constants/Colors';
import { useActivity } from '@/context/ActivityContext';
import { type Activity, describeActivity, fetchActivity } from '@/lib/activity';
import { timeAgo } from '@/lib/time';

export default function ActivityScreen() {
  const router = useRouter();
  const { markAllSeen, latest } = useActivity();
  const [items, setItems] = useState<Activity[] | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      setItems(await fetchActivity());
    } catch (error) {
      console.warn('Failed to load activity', error);
      setItems((current) => current ?? []);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
      markAllSeen();
    }, [load, markAllSeen])
  );

  // Something that arrives live while this screen is open goes straight to the top.
  const list =
    items && latest && !items.some((item) => item.id === latest.id) &&
    latest.createdAt >= (items[0]?.createdAt ?? 0)
      ? [latest, ...items]
      : items;

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  return (
    <View style={styles.screen}>
      <GlassBackdrop />
      <FlatList
      style={styles.list}
      contentContainerStyle={styles.content}
      data={list ?? []}
      keyExtractor={(item) => item.id}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.light.tint} />
      }
      ListEmptyComponent={
        items === null ? (
          <ActivityIndicator color={Colors.light.tint} style={styles.loading} />
        ) : (
          <View style={styles.empty}>
            <Ionicons name="heart-outline" size={40} color={Colors.light.tint} />
            <Text style={styles.emptyTitle}>No activity yet</Text>
            <Text style={styles.emptyText}>
              When someone follows you, or likes or comments on your posts, you’ll see it here.
            </Text>
          </View>
        )
      }
      renderItem={({ item }) => (
        <Pressable
          onPress={() =>
            item.postId
              ? router.push({ pathname: '/comments/[postId]', params: { postId: item.postId } })
              : router.push({
                  pathname: '/user/[userId]',
                  params: { userId: item.actorId, name: item.actorName },
                })
          }
          accessibilityRole="button"
          style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
          <Pressable
            onPress={() =>
              router.push({
                pathname: '/user/[userId]',
                params: { userId: item.actorId, name: item.actorName },
              })
            }
            hitSlop={4}
            accessibilityRole="link"
            accessibilityLabel={`View ${item.actorName}'s profile`}
            style={styles.avatarWrap}>
            <Avatar name={item.actorName} userId={item.actorId} size={44} />
            <View style={styles.kind}>
              <Ionicons
                name={item.type === 'like' ? 'heart' : item.type === 'follow' ? 'person-add' : 'car-sport'}
                size={11}
                color={Colors.light.onTint}
              />
            </View>
          </Pressable>
          <Text style={styles.text} numberOfLines={3}>
            {describeActivity(item)}
            <Text style={styles.time}> · {timeAgo(item.createdAt)}</Text>
          </Text>
          {item.postImageUri ? (
            <Image source={{ uri: item.postImageUri }} style={styles.thumb} contentFit="cover" />
          ) : null}
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
  wrap: {
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
    flexGrow: 1,
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
  avatarWrap: {
    width: 44,
    height: 44,
  },
  kind: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Colors.light.tint,
    borderWidth: 2,
    borderColor: Colors.light.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    flex: 1,
    color: Colors.light.text,
    lineHeight: 20,
  },
  time: {
    color: Colors.light.muted,
  },
  thumb: {
    width: 48,
    height: 48,
    borderRadius: 6,
    backgroundColor: Colors.light.imagePlaceholder,
  },
  loading: {
    marginTop: 48,
  },
  empty: {
    alignItems: 'center',
    gap: 8,
    marginTop: 64,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    color: Colors.light.text,
    fontSize: 18,
    fontWeight: '800',
  },
  emptyText: {
    color: Colors.light.muted,
    textAlign: 'center',
    lineHeight: 20,
  },
});
