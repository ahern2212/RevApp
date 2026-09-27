import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Avatar } from '@/components/Avatar';
import { FollowStats } from '@/components/FollowStats';
import { GarageSection } from '@/components/GarageSection';
import { PostGrid } from '@/components/PostGrid';
import Colors from '@/constants/Colors';
import { GlassBackdrop } from '@/components/GlassBackdrop';
import { glass } from '@/constants/glass';
import { THEMES } from '@/constants/themes';
import { useGarage } from '@/context/GarageContext';
import { useProfile } from '@/context/ProfilesContext';
import { confirm } from '@/lib/confirm';
import { fetchFollowCounts, type FollowCounts, type FollowList } from '@/lib/follows';
import { useTabBarSpace } from '@/lib/layout';
import { fetchUserPosts } from '@/lib/posts';
import type { Post } from '@/types';

type Section = 'posts' | 'saved';

const SECTIONS: { key: Section; label: string; icon: 'grid-outline' | 'bookmark-outline' }[] = [
  { key: 'posts', label: 'Posts', icon: 'grid-outline' },
  { key: 'saved', label: 'Saved', icon: 'bookmark-outline' },
];

export default function ProfileScreen() {
  const { user, posts, saved, signOut, refresh } = useGarage();
  const tabBarSpace = useTabBarSpace();
  const router = useRouter();
  const profile = useProfile(user?.id);
  const [section, setSection] = useState<Section>('posts');
  const [mine, setMine] = useState<Post[] | null>(null);
  const [counts, setCounts] = useState<FollowCounts | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const userId = user?.id;

  // All of the user's posts, not just the ones loaded in the feed. Reloads on every visit
  // so new posts, deletes and like counts are current.
  const loadMine = useCallback(async () => {
    if (!userId) return;
    fetchFollowCounts(userId)
      .then(setCounts)
      .catch((error) => console.warn('Failed to load follow counts', error));
    try {
      setMine(await fetchUserPosts(userId));
    } catch (error) {
      console.warn('Failed to load your posts', error);
    }
  }, [userId]);

  useFocusEffect(
    useCallback(() => {
      loadMine();
    }, [loadMine])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadMine(), refresh()]);
    setRefreshing(false);
  };

  const onSignOut = async () => {
    if (await confirm('Sign out?', 'You can sign back in any time.', 'Sign out')) signOut();
  };

  // Until the first load finishes, fall back to what the feed already has.
  const myPosts = mine ?? posts.filter((post) => post.authorId === userId);
  const likes = myPosts.reduce((total, post) => total + post.likedBy.length, 0);
  const shown = section === 'posts' ? myPosts : saved;

  return (
    <View style={styles.screen}>
      <GlassBackdrop />
      <ScrollView
      style={styles.wrap}
      contentContainerStyle={[styles.content, { paddingBottom: tabBarSpace }]}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.light.tint} />
      }>
      <View style={styles.header}>
        <Avatar name={user?.username ?? ''} userId={user?.id} size={72} />
        <View style={styles.stats}>
          <Text style={styles.name}>{user?.username}</Text>
          <Text style={styles.meta}>
            {myPosts.length} {myPosts.length === 1 ? 'post' : 'posts'} · {likes} likes ·{' '}
            {saved.length} saved
          </Text>
          {counts && userId ? (
            <FollowStats
              counts={counts}
              onOpen={(list: FollowList) =>
                router.push({
                  pathname: '/follows/[userId]',
                  params: { userId, name: user?.username ?? '', list },
                })
              }
            />
          ) : null}
        </View>
      </View>
      {profile?.bio ? <Text style={styles.bio}>{profile.bio}</Text> : null}
      <View style={styles.actions}>
        <Pressable
          onPress={() => router.push('/edit-profile')}
          style={[styles.signOut, styles.editButton]}
          accessibilityRole="button">
          <Ionicons name="create-outline" size={16} color={Colors.light.onTint} />
          <Text style={[styles.signOutText, styles.editText]}>Edit profile</Text>
        </Pressable>
        <Pressable onPress={onSignOut} style={styles.signOut} accessibilityRole="button">
          <Text style={styles.signOutText}>Sign out</Text>
        </Pressable>
      </View>

      <Pressable
        onPress={() => router.push('/themes')}
        accessibilityRole="button"
        style={({ pressed }) => [styles.themesRow, pressed && styles.pressed]}>
        <Ionicons name="color-palette-outline" size={20} color={Colors.light.tint} />
        <View style={styles.themesText}>
          <Text style={styles.themesTitle}>Vote on app colors</Text>
          <Text style={styles.themesSubtitle}>Help pick RevApp’s next look</Text>
        </View>
        <View style={styles.themeDots}>
          {THEMES.map((theme) => (
            <View key={theme.id} style={[styles.themeDot, { backgroundColor: theme.colors.tint }]} />
          ))}
        </View>
        <Ionicons name="chevron-forward" size={18} color={Colors.light.muted} />
      </Pressable>

      {userId ? <GarageSection ownerId={userId} editable /> : null}

      <View style={styles.tabs} accessibilityRole="tablist">
        {SECTIONS.map(({ key, label, icon }) => {
          const active = section === key;
          return (
            <Pressable
              key={key}
              onPress={() => setSection(key)}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              style={[styles.tab, active && styles.tabActive]}>
              <Ionicons
                name={icon}
                size={20}
                color={active ? Colors.light.tint : Colors.light.muted}
              />
              <Text style={[styles.tabText, active && styles.tabTextActive]}>{label}</Text>
            </Pressable>
          );
        })}
      </View>

      <PostGrid
        posts={shown}
        emptyText={
          section === 'posts'
            ? 'Your garage is empty. Post a car from the Post tab.'
            : 'Nothing saved yet. Tap the bookmark on any post to keep it here.'
        }
      />
    </ScrollView>
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
    marginBottom: 16,
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
  themesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 14,
    ...glass,
    marginBottom: 20,
  },
  pressed: {
    opacity: 0.8,
  },
  themesText: {
    flex: 1,
  },
  themesTitle: {
    color: Colors.light.text,
    fontWeight: '800',
  },
  themesSubtitle: {
    color: Colors.light.muted,
    fontSize: 12,
    marginTop: 1,
  },
  themeDots: {
    flexDirection: 'row',
  },
  themeDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    marginLeft: -4,
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  bio: {
    color: Colors.light.text,
    lineHeight: 20,
    marginBottom: 14,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.light.tint,
    borderColor: Colors.light.tint,
  },
  editText: {
    color: Colors.light.onTint,
  },
  signOut: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: Colors.light.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  signOutText: {
    color: Colors.light.text,
    fontWeight: '600',
  },
  tabs: {
    flexDirection: 'row',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.light.border,
    marginBottom: 12,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: Colors.light.tint,
  },
  tabText: {
    color: Colors.light.muted,
    fontWeight: '600',
  },
  tabTextActive: {
    color: Colors.light.tint,
  },
});
