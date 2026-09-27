import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { Avatar } from '@/components/Avatar';
import { PostVideo } from '@/components/PostVideo';
import Colors from '@/constants/Colors';
import { glass } from '@/constants/glass';
import { timeAgo } from '@/lib/time';
import { toggleVideoMuted } from '@/lib/videoSound';
import type { Post } from '@/types';

const DOUBLE_TAP_MS = 300;
const CAPTION_PREVIEW_CHARS = 110;

type Props = {
  post: Post;
  /** The post most in view; only its video plays. */
  active?: boolean;
  liked: boolean;
  onLike: () => void;
  onComment: () => void;
  saved: boolean;
  onSave: () => void;
  onShare: () => void;
  onAuthorPress: () => void;
  onLikesPress: () => void;
  /** Opens the "…" menu (edit/delete on your own posts, report/block on others'). */
  onOptions?: () => void;
};

export function PostCard({
  post,
  active = false,
  liked,
  onLike,
  onComment,
  saved,
  onSave,
  onShare,
  onAuthorPress,
  onLikesPress,
  onOptions,
}: Props) {
  const heartScale = useSharedValue(1);
  const heartStyle = useAnimatedStyle(() => ({ transform: [{ scale: heartScale.get() }] }));

  // Big heart that pops over the photo on double-tap.
  const burstScale = useSharedValue(0);
  const burstOpacity = useSharedValue(0);
  const burstStyle = useAnimatedStyle(() => ({
    opacity: burstOpacity.get(),
    transform: [{ scale: burstScale.get() }],
  }));
  const lastTap = useRef(0);
  const soundTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (soundTimer.current) clearTimeout(soundTimer.current);
  }, []);
  const [captionOpen, setCaptionOpen] = useState(false);
  const longCaption =
    post.caption.length > CAPTION_PREVIEW_CHARS || post.caption.split('\n').length > 2;

  const popSmallHeart = () =>
    heartScale.set(withSequence(withTiming(1.3, { duration: 120 }), withSpring(1)));

  const handleLike = () => {
    if (!liked) popSmallHeart();
    onLike();
  };

  // Double-tap only ever likes (never unlikes), like Instagram. On a video, a single tap
  // turns the sound on or off once we know it wasn't the first half of a double-tap.
  const handlePhotoPress = () => {
    const now = Date.now();
    if (now - lastTap.current > DOUBLE_TAP_MS) {
      lastTap.current = now;
      if (post.videoUri) {
        soundTimer.current = setTimeout(() => {
          soundTimer.current = null;
          toggleVideoMuted();
        }, DOUBLE_TAP_MS);
      }
      return;
    }
    lastTap.current = 0;
    if (soundTimer.current) {
      clearTimeout(soundTimer.current);
      soundTimer.current = null;
    }
    burstScale.set(
      withSequence(withTiming(0.3, { duration: 0 }), withSpring(1, { damping: 9, stiffness: 180 }))
    );
    burstOpacity.set(
      withSequence(withTiming(1, { duration: 80 }), withDelay(500, withTiming(0, { duration: 220 })))
    );
    if (!liked) {
      popSmallHeart();
      onLike();
    }
  };

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Pressable
          onPress={onAuthorPress}
          style={styles.author}
          accessibilityRole="link"
          accessibilityLabel={`View ${post.authorName}'s profile`}>
          <Avatar name={post.authorName} userId={post.authorId} size={36} />
          <View style={styles.authorText}>
            <Text style={styles.username}>{post.authorName}</Text>
            <Text style={styles.meta} numberOfLines={1}>
              {post.car ? `${post.car} · ` : ''}
              {timeAgo(post.createdAt)}
            </Text>
          </View>
        </Pressable>
        {onOptions ? (
          <Pressable
            onPress={onOptions}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel="Post options">
            <Ionicons name="ellipsis-horizontal" size={20} color={Colors.light.text} />
          </Pressable>
        ) : null}
      </View>

      <Pressable
        onPress={handlePhotoPress}
        accessibilityRole="image"
        accessibilityLabel={
          post.videoUri
            ? post.car ? `Video of ${post.car}` : 'Car video'
            : post.car ? `Photo of ${post.car}` : 'Car photo'
        }
        accessibilityHint={post.videoUri ? 'Tap for sound. Double-tap to like' : 'Double-tap to like'}>
        {post.videoUri ? (
          <PostVideo uri={post.videoUri} posterUri={post.imageUri} active={active} style={styles.photo} />
        ) : (
          <Image
            source={{ uri: post.imageUri }}
            style={styles.photo}
            contentFit="cover"
            transition={200}
          />
        )}
        <Animated.View pointerEvents="none" style={[styles.burst, burstStyle]}>
          <Ionicons name="heart" size={96} color="#ffffff" style={styles.burstIcon} />
        </Animated.View>
      </Pressable>

      <View style={styles.actions}>
        <Pressable
          onPress={handleLike}
          hitSlop={8}
          style={styles.actionButton}
          accessibilityRole="button"
          accessibilityLabel={liked ? 'Unlike' : 'Like'}
          accessibilityState={{ selected: liked }}>
          <Animated.View style={heartStyle}>
            <Ionicons
              name={liked ? 'heart' : 'heart-outline'}
              color={liked ? Colors.light.tint : Colors.light.text}
              size={26}
            />
          </Animated.View>
        </Pressable>
        <Pressable
          onPress={post.likedBy.length > 0 ? onLikesPress : handleLike}
          hitSlop={8}
          style={styles.likeCount}
          accessibilityRole="button"
          accessibilityLabel={`${post.likedBy.length} likes. See who liked this`}>
          <Text style={[styles.count, liked && { color: Colors.light.tint }]}>
            {post.likedBy.length}
          </Text>
        </Pressable>
        <Pressable
          onPress={onComment}
          hitSlop={8}
          style={styles.actionButton}
          accessibilityRole="button"
          accessibilityLabel={`Comments, ${post.commentCount}`}>
          <Ionicons name="car-sport-outline" color={Colors.light.text} size={28} />
          <Text style={styles.count}>{post.commentCount}</Text>
        </Pressable>
        <Pressable
          onPress={onShare}
          hitSlop={8}
          style={styles.actionButton}
          accessibilityRole="button"
          accessibilityLabel="Share post">
          <Ionicons name="paper-plane-outline" color={Colors.light.text} size={24} />
        </Pressable>
        <Pressable
          onPress={onSave}
          hitSlop={8}
          style={styles.saveButton}
          accessibilityRole="button"
          accessibilityLabel={saved ? 'Remove from saved' : 'Save post'}
          accessibilityState={{ selected: saved }}>
          <Ionicons
            name={saved ? 'bookmark' : 'bookmark-outline'}
            color={saved ? Colors.light.tint : Colors.light.text}
            size={24}
          />
        </Pressable>
      </View>
      {post.caption ? (
        <Text
          style={styles.caption}
          numberOfLines={longCaption && !captionOpen ? 2 : undefined}
          onPress={longCaption && !captionOpen ? () => setCaptionOpen(true) : undefined}>
          <Text style={styles.username} onPress={onAuthorPress}>
            {post.authorName}{' '}
          </Text>
          {post.caption}
        </Text>
      ) : null}
      {longCaption && !captionOpen ? (
        <Pressable onPress={() => setCaptionOpen(true)} accessibilityRole="button">
          <Text style={styles.more}>more</Text>
        </Pressable>
      ) : null}
      {post.commentCount > 0 ? (
        <Pressable onPress={onComment} accessibilityRole="button">
          <Text style={styles.viewComments}>
            View {post.commentCount === 1 ? '1 comment' : `all ${post.commentCount} comments`}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    ...glass,
    borderRadius: 22,
    marginHorizontal: 10,
    marginBottom: 14,
    paddingBottom: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  author: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  authorText: {
    flex: 1,
  },
  username: {
    color: Colors.light.text,
    fontWeight: '700',
  },
  meta: {
    color: Colors.light.muted,
    fontSize: 12,
    marginTop: 2,
  },
  photo: {
    width: '100%',
    aspectRatio: 4 / 5,
    backgroundColor: Colors.light.imagePlaceholder,
  },
  burst: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  burstIcon: {
    textShadowColor: 'rgba(45, 31, 71, 0.35)',
    textShadowOffset: { width: 0, height: 4 },
    textShadowRadius: 16,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
    paddingHorizontal: 14,
    paddingTop: 10,
  },
  likeCount: {
    marginLeft: -12,
  },
  saveButton: {
    marginLeft: 'auto',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  count: {
    color: Colors.light.text,
    fontWeight: '600',
  },
  caption: {
    color: Colors.light.text,
    paddingHorizontal: 14,
    paddingTop: 8,
    lineHeight: 20,
  },
  more: {
    color: Colors.light.muted,
    fontWeight: '600',
    paddingHorizontal: 14,
    paddingTop: 2,
  },
  viewComments: {
    color: Colors.light.muted,
    paddingHorizontal: 14,
    paddingTop: 6,
  },
});
