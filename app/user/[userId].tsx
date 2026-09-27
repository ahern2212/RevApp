import { Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Avatar } from '@/components/Avatar';
import { GarageSection } from '@/components/GarageSection';
import { PostGrid } from '@/components/PostGrid';
import { useProfile } from '@/context/ProfilesContext';
import Colors from '@/constants/Colors';
import { fetchUserPosts } from '@/lib/posts';
import type { Post } from '@/types';

export default function UserProfileScreen() {
  const { userId, name } = useLocalSearchParams<{ userId: string; name?: string }>();
  const [posts, setPosts] = useState<{ userId: string; list: Post[] } | null>(null);
  const [failed, setFailed] = useState(false);
  const profile = useProfile(userId);
  const list = posts?.userId === userId ? posts.list : null;
  const username = name ?? list?.[0]?.authorName ?? 'driver';
  const likes = list?.reduce((total, post) => total + post.likedBy.length, 0) ?? 0;

  useEffect(() => {
    let cancelled = false;
    fetchUserPosts(userId)
      .then((next) => !cancelled && setPosts({ userId, list: next }))
      .catch((error) => {
        console.warn('Failed to load profile', error);
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  return (
    <ScrollView style={styles.wrap} contentContainerStyle={styles.content}>
      <Stack.Screen options={{ title: username }} />
      <View style={styles.header}>
        <Avatar name={username} userId={userId} size={72} />
        <View style={styles.stats}>
          <Text style={styles.name}>{username}</Text>
          <Text style={styles.meta}>
            {list ? `${list.length} ${list.length === 1 ? 'post' : 'posts'} · ${likes} likes` : ' '}
          </Text>
        </View>
      </View>
      {profile?.bio ? <Text style={styles.bio}>{profile.bio}</Text> : null}
      <GarageSection ownerId={userId} editable={false} />
      {list ? (
        <PostGrid posts={list} emptyText={`${username} hasn’t posted a car yet.`} />
      ) : failed ? (
        <Text style={styles.error}>Couldn’t load this garage. Pull back and try again.</Text>
      ) : (
        <ActivityIndicator color={Colors.light.tint} style={styles.loading} />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  content: {
    padding: 16,
    maxWidth: 640,
    width: '100%',
    alignSelf: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 20,
  },
  stats: {
    flex: 1,
  },
  name: {
    color: Colors.light.text,
    fontSize: 24,
    fontWeight: '800',
  },
  meta: {
    color: Colors.light.muted,
    marginTop: 4,
  },
  bio: {
    color: Colors.light.text,
    lineHeight: 20,
    marginTop: -8,
    marginBottom: 16,
  },
  loading: {
    marginTop: 32,
  },
  error: {
    color: Colors.light.danger,
    textAlign: 'center',
    marginTop: 24,
  },
});
