import Ionicons from '@expo/vector-icons/Ionicons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { Avatar } from '@/components/Avatar';
import { Chip } from '@/components/Chip';
import { GlassBackdrop } from '@/components/GlassBackdrop';
import Colors from '@/constants/Colors';
import { fetchFollowList, type FollowList, type FollowPerson } from '@/lib/follows';

type Loaded = { key: string; people: FollowPerson[] } | { key: string; error: string };

/** Followers / Following for one driver, with a toggle between the two lists. */
export default function FollowsScreen() {
  const params = useLocalSearchParams<{ userId: string; name?: string; list?: FollowList }>();
  const { userId, name } = params;
  const router = useRouter();
  const [list, setList] = useState<FollowList>(params.list === 'following' ? 'following' : 'followers');
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const key = `${userId}:${list}`;
  const current = loaded?.key === key ? loaded : null;

  useEffect(() => {
    let cancelled = false;
    fetchFollowList(userId, list)
      .then((people) => !cancelled && setLoaded({ key, people }))
      .catch((error: Error) => !cancelled && setLoaded({ key, error: error.message }));
    return () => {
      cancelled = true;
    };
  }, [userId, list, key]);

  return (
    <View style={styles.screen}>
      <GlassBackdrop />
      <Stack.Screen options={{ title: name ? `@${name}` : 'Drivers' }} />
      <FlatList
        style={styles.list}
        contentContainerStyle={styles.content}
        data={current && 'people' in current ? current.people : []}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={
          <View style={styles.tabs} accessibilityRole="tablist">
            <Chip label="Followers" active={list === 'followers'} onPress={() => setList('followers')} />
            <Chip label="Following" active={list === 'following'} onPress={() => setList('following')} />
          </View>
        }
        ListEmptyComponent={
          !current ? (
            <ActivityIndicator color={Colors.light.tint} style={styles.loading} />
          ) : 'error' in current ? (
            <Text style={styles.empty}>{current.error}</Text>
          ) : (
            <Text style={styles.empty}>
              {list === 'followers' ? 'No followers yet.' : 'Not following anyone yet.'}
            </Text>
          )
        }
        renderItem={({ item }) => (
          <Pressable
            onPress={() =>
              router.push({ pathname: '/user/[userId]', params: { userId: item.id, name: item.username } })
            }
            accessibilityRole="link"
            style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
            <Avatar name={item.username} userId={item.id} size={40} />
            <Text style={styles.username}>{item.username}</Text>
            <Ionicons name="chevron-forward" size={16} color={Colors.light.muted} />
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
  tabs: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    paddingBottom: 8,
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
  username: {
    flex: 1,
    color: Colors.light.text,
    fontWeight: '700',
  },
  loading: {
    marginTop: 48,
  },
  empty: {
    color: Colors.light.muted,
    textAlign: 'center',
    marginTop: 48,
    paddingHorizontal: 24,
  },
});
