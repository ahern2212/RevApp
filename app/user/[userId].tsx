import Ionicons from '@expo/vector-icons/Ionicons';
import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Avatar } from '@/components/Avatar';
import { FollowStats } from '@/components/FollowStats';
import { GarageSection } from '@/components/GarageSection';
import { GlassBackdrop } from '@/components/GlassBackdrop';
import { OptionsSheet } from '@/components/OptionsSheet';
import { PostGrid } from '@/components/PostGrid';
import { confirmBlock } from '@/components/SafetyActions';
import Colors from '@/constants/Colors';
import { glass } from '@/constants/glass';
import { useGarage } from '@/context/GarageContext';
import { useProfile } from '@/context/ProfilesContext';
import { showError } from '@/lib/confirm';
import { fetchFollowCounts, follow, type FollowCounts, isFollowing, unfollow } from '@/lib/follows';
import { fetchUserPosts } from '@/lib/posts';
import { hasBlocked, unblockUser } from '@/lib/safety';
import type { Post } from '@/types';

type Relationship = { userId: string; following: boolean; blocked: boolean; counts: FollowCounts | null };

export default function UserProfileScreen() {
  const { userId, name } = useLocalSearchParams<{ userId: string; name?: string }>();
  const router = useRouter();
  const { user, forgetPosts } = useGarage();
  const [posts, setPosts] = useState<{ userId: string; list: Post[] } | null>(null);
  const [failed, setFailed] = useState(false);
  const [relationship, setRelationship] = useState<Relationship | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const profile = useProfile(userId);
  const list = posts?.userId === userId ? posts.list : null;
  const rel = relationship?.userId === userId ? relationship : null;
  const username = profile?.username ?? name ?? list?.[0]?.authorName ?? 'driver';
  const likes = list?.reduce((total, post) => total + post.likedBy.length, 0) ?? 0;
  const isMe = user?.id === userId;
  const myId = user?.id;

  // Reload on every visit so follows, blocks and new posts are current.
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      fetchUserPosts(userId)
        .then((next) => {
          if (cancelled) return;
          setPosts({ userId, list: next });
          setFailed(false);
        })
        .catch((error) => {
          console.warn('Failed to load profile', error);
          if (!cancelled) setFailed(true);
        });
      Promise.all([
        fetchFollowCounts(userId),
        myId && myId !== userId ? isFollowing(myId, userId) : false,
        myId && myId !== userId ? hasBlocked(userId) : false,
      ])
        .then(([counts, following, blocked]) => {
          if (!cancelled) setRelationship({ userId, counts, following, blocked });
        })
        .catch((error) => console.warn('Failed to load follows', error));
      return () => {
        cancelled = true;
      };
    }, [userId, myId])
  );

  const toggleFollow = async () => {
    if (!myId || !rel || busy) return;
    const next = !rel.following;
    const counts = rel.counts && { ...rel.counts, followers: Math.max(0, rel.counts.followers + (next ? 1 : -1)) };
    setBusy(true);
    setRelationship({ ...rel, following: next, counts });
    try {
      if (next) await follow(userId);
      else await unfollow(myId, userId);
    } catch (error) {
      setRelationship(rel);
      showError(next ? 'Could not follow' : 'Could not unfollow', error);
    } finally {
      setBusy(false);
    }
  };

  const block = async () => {
    if (!rel || !(await confirmBlock(userId, username))) return;
    forgetPosts((post) => post.authorId === userId);
    setRelationship({ ...rel, blocked: true, following: false });
    setPosts({ userId, list: [] });
  };

  const unblock = async () => {
    if (!rel) return;
    try {
      await unblockUser(userId);
      setRelationship({ ...rel, blocked: false });
      setPosts({ userId, list: await fetchUserPosts(userId) });
    } catch (error) {
      showError('Could not unblock', error);
    }
  };

  const openList = (listName: 'followers' | 'following') =>
    router.push({ pathname: '/follows/[userId]', params: { userId, name: username, list: listName } });

  return (
    <View style={styles.screen}>
      <GlassBackdrop />
      <ScrollView style={styles.list} contentContainerStyle={styles.content}>
        <Stack.Screen options={{ title: username }} />
        <View style={styles.header}>
          <Avatar name={username} userId={userId} size={72} />
          <View style={styles.stats}>
            <Text style={styles.name}>{username}</Text>
            <Text style={styles.meta}>
              {list ? `${list.length} ${list.length === 1 ? 'post' : 'posts'} · ${likes} likes` : ' '}
            </Text>
            {rel?.counts ? <FollowStats counts={rel.counts} onOpen={openList} /> : null}
          </View>
        </View>
        {profile?.bio ? <Text style={styles.bio}>{profile.bio}</Text> : null}

        {!isMe && rel && !rel.blocked ? (
          <View style={styles.actions}>
            {rel.counts ? (
              <Pressable
                onPress={toggleFollow}
                disabled={busy}
                accessibilityRole="button"
                accessibilityState={{ selected: rel.following, busy }}
                style={({ pressed }) => [
                  styles.follow,
                  rel.following && styles.following,
                  pressed && styles.pressed,
                ]}>
                <Ionicons
                  name={rel.following ? 'checkmark' : 'person-add-outline'}
                  size={16}
                  color={rel.following ? Colors.light.tint : Colors.light.onTint}
                />
                <Text style={[styles.followText, rel.following && styles.followingText]}>
                  {rel.following ? 'Following' : 'Follow'}
                </Text>
              </Pressable>
            ) : (
              <View style={styles.spacer} />
            )}
            <Pressable
              onPress={() => setMenuOpen(true)}
              accessibilityRole="button"
              accessibilityLabel="More options"
              style={({ pressed }) => [styles.more, pressed && styles.pressed]}>
              <Ionicons name="ellipsis-horizontal" size={20} color={Colors.light.text} />
            </Pressable>
          </View>
        ) : null}

        {rel?.blocked ? (
          <View style={styles.blockedCard}>
            <Ionicons name="ban-outline" size={28} color={Colors.light.muted} />
            <Text style={styles.blockedText}>
              You blocked @{username}. You won’t see each other’s posts, comments or listings.
            </Text>
            <Pressable onPress={unblock} accessibilityRole="button" style={styles.unblock}>
              <Text style={styles.unblockText}>Unblock</Text>
            </Pressable>
          </View>
        ) : (
          <>
            <GarageSection ownerId={userId} editable={false} />
            {list ? (
              <PostGrid posts={list} emptyText={`${username} hasn’t posted a car yet.`} />
            ) : failed ? (
              <Text style={styles.error}>Couldn’t load this garage. Pull back and try again.</Text>
            ) : (
              <ActivityIndicator color={Colors.light.tint} style={styles.loading} />
            )}
          </>
        )}
      </ScrollView>
      <OptionsSheet
        visible={menuOpen}
        onClose={() => setMenuOpen(false)}
        options={[{ label: `Block @${username}`, icon: 'ban-outline', destructive: true, onPress: block }]}
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
  actions: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
  },
  spacer: {
    flex: 1,
  },
  follow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: Colors.light.tint,
    borderRadius: 12,
    paddingVertical: 10,
  },
  following: {
    ...glass,
    shadowOpacity: 0,
  },
  followText: {
    color: Colors.light.onTint,
    fontWeight: '800',
  },
  followingText: {
    color: Colors.light.tint,
  },
  more: {
    ...glass,
    shadowOpacity: 0,
    width: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.8,
  },
  blockedCard: {
    ...glass,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    gap: 10,
  },
  blockedText: {
    color: Colors.light.muted,
    textAlign: 'center',
    lineHeight: 20,
  },
  unblock: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.light.tint,
    paddingHorizontal: 18,
    paddingVertical: 8,
  },
  unblockText: {
    color: Colors.light.tint,
    fontWeight: '800',
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
