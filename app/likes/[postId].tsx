import Ionicons from '@expo/vector-icons/Ionicons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { Avatar } from '@/components/Avatar';
import { GlassBackdrop } from '@/components/GlassBackdrop';
import Colors from '@/constants/Colors';
import { supabase } from '@/lib/supabase';

type Liker = { id: string; username: string };

async function fetchLikers(postId: string): Promise<Liker[]> {
  const { data, error } = await supabase
    .from('likes')
    .select('user_id, created_at, profile:profiles!likes_user_id_fkey(username)')
    .eq('post_id', postId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data as unknown as { user_id: string; profile: { username: string } | null }[]).map(
    (row) => ({ id: row.user_id, username: row.profile?.username ?? 'driver' })
  );
}

export default function LikesScreen() {
  const { postId } = useLocalSearchParams<{ postId: string }>();
  const router = useRouter();
  const [likers, setLikers] = useState<{ postId: string; list: Liker[] } | null>(null);
  const list = likers?.postId === postId ? likers.list : null;

  useEffect(() => {
    let cancelled = false;
    fetchLikers(postId)
      .then((next) => !cancelled && setLikers({ postId, list: next }))
      .catch((error) => {
        console.warn('Failed to load likes', error);
        if (!cancelled) setLikers({ postId, list: [] });
      });
    return () => {
      cancelled = true;
    };
  }, [postId]);

  return (
    <View style={styles.screen}>
      <GlassBackdrop />
      <FlatList
      style={styles.list}
      contentContainerStyle={styles.content}
      data={list ?? []}
      keyExtractor={(item) => item.id}
      ListEmptyComponent={
        list === null ? (
          <ActivityIndicator color={Colors.light.tint} style={styles.loading} />
        ) : (
          <Text style={styles.empty}>No likes yet.</Text>
        )
      }
      renderItem={({ item }) => (
        <Pressable
          onPress={() =>
            router.push({
              pathname: '/user/[userId]',
              params: { userId: item.id, name: item.username },
            })
          }
          accessibilityRole="link"
          style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
          <Avatar name={item.username} userId={item.id} size={40} />
          <Text style={styles.username}>{item.username}</Text>
          <Ionicons name="heart" size={16} color={Colors.light.tint} />
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
  },
});
