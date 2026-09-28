import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect, useRouter } from 'expo-router';
import { type ReactNode, useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import Animated, { css, FadeInRight } from 'react-native-reanimated';

import { Avatar } from '@/components/Avatar';
import { PressableScale } from '@/components/PressableScale';
import Colors from '@/constants/Colors';
import { useGarage } from '@/context/GarageContext';
import { showError } from '@/lib/confirm';
import { pickPostMedia } from '@/lib/media';
import { cleanUpExpiredStories, fetchStoryTray, postStory, type StoryTrayItem } from '@/lib/stories';

const RING = 64;

// Expired stories' files are tidied up once per app session.
let cleanedUpFor: string | null = null;

function Bubble({
  name,
  avatarName,
  userId,
  unseen,
  label,
  onPress,
  badge,
  index,
}: {
  name: string;
  /** Name for the avatar letter when it differs from the label (e.g. "Your story"). */
  avatarName?: string;
  userId?: string;
  unseen: boolean;
  label: string;
  onPress: () => void;
  badge?: ReactNode;
  /** Position in the row, for the staggered entrance. */
  index: number;
}) {
  return (
    <Animated.View entering={FadeInRight.delay(Math.min(index, 8) * 60).springify().damping(16)}>
      <PressableScale
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={label}
        scaleTo={0.9}
        style={styles.bubble}>
        <Animated.View style={[styles.ring, unseen ? [styles.ringUnseen, motion.pulse] : styles.ringSeen]}>
          <Avatar name={avatarName ?? name} userId={userId} size={RING - 8} />
        </Animated.View>
        <Text style={styles.name} numberOfLines={1}>
          {name}
        </Text>
      </PressableScale>
      {badge}
    </Animated.View>
  );
}

/**
 * Stories row at the top of the feed: your story first (tap "+" to add one), then people you
 * follow, unseen first. `refreshSignal` changes when the feed is pulled to refresh.
 */
export function StoryTray({ refreshSignal }: { refreshSignal: number }) {
  const router = useRouter();
  const { user } = useGarage();
  const [tray, setTray] = useState<StoryTrayItem[] | null>(null);
  const [posting, setPosting] = useState(false);
  const userId = user?.id;

  const load = useCallback(() => {
    fetchStoryTray()
      .then(setTray)
      .catch((error) => console.warn('Failed to load stories', error));
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  // Pull-to-refresh on the feed reloads the tray too.
  useEffect(() => {
    if (refreshSignal > 0) load();
  }, [refreshSignal, load]);

  useEffect(() => {
    if (!userId || cleanedUpFor === userId) return;
    cleanedUpFor = userId;
    cleanUpExpiredStories(userId).catch(() => {});
  }, [userId]);

  if (!tray || !user) return null;

  const mine = tray.find((item) => item.authorId === user.id);
  const others = tray.filter((item) => item.authorId !== user.id);

  const openStories = (item: StoryTrayItem) =>
    router.push({ pathname: '/story/[authorId]', params: { authorId: item.authorId, name: item.username } });

  const addStory = async () => {
    try {
      const picked = await pickPostMedia({ single: true });
      if (!picked?.[0]) return;
      setPosting(true);
      await postStory(user.id, picked[0]);
      load();
    } catch (error) {
      showError('Could not add story', error);
    } finally {
      setPosting(false);
    }
  };

  const addBadge = (
    <Pressable
      onPress={addStory}
      hitSlop={6}
      accessibilityRole="button"
      accessibilityLabel="Add to your story"
      style={styles.addBadge}>
      {posting ? (
        <ActivityIndicator size="small" color={Colors.light.onTint} />
      ) : (
        <Ionicons name="add" size={16} color={Colors.light.onTint} />
      )}
    </Pressable>
  );

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
      <Bubble
        name="Your story"
        avatarName={user.username}
        userId={user.id}
        unseen={!!mine}
        label={mine ? 'View your story' : 'Add to your story'}
        onPress={mine ? () => openStories(mine) : addStory}
        badge={addBadge}
        index={0}
      />
      {others.map((item, i) => (
        <Bubble
          key={item.authorId}
          index={i + 1}
          name={item.username}
          userId={item.authorId}
          unseen={item.unseen > 0}
          label={`${item.username}'s story${item.unseen > 0 ? ', new' : ''}`}
          onPress={() => openStories(item)}
        />
      ))}
    </ScrollView>
  );
}

// Unseen stories get a ring that gently pulses (Reanimated CSS keyframes; css.create so it
// works on the web too).
const motion = css.create({
  pulse: {
    animationName: {
      '0%': { transform: [{ scale: 1 }] },
      '50%': { transform: [{ scale: 1.05 }] },
      '100%': { transform: [{ scale: 1 }] },
    },
    animationDuration: 1800,
    animationIterationCount: 'infinite',
    animationTimingFunction: 'ease-in-out',
  },
});

const styles = StyleSheet.create({
  row: {
    gap: 12,
    paddingHorizontal: 12,
    paddingTop: 8,
  },
  bubble: {
    width: RING + 8,
    alignItems: 'center',
    gap: 4,
  },
  ring: {
    width: RING,
    height: RING,
    borderRadius: RING / 2,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringUnseen: {
    borderColor: Colors.light.tint,
  },
  ringSeen: {
    borderColor: Colors.light.border,
  },
  addBadge: {
    position: 'absolute',
    top: RING - 22,
    right: 2,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.light.tint,
    borderWidth: 2,
    borderColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: {
    color: Colors.light.text,
    fontSize: 12,
    fontWeight: '600',
    maxWidth: RING + 8,
  },
});
