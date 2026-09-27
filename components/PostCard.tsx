import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import Colors from '@/constants/Colors';
import { timeAgo } from '@/lib/time';
import type { Post } from '@/types';

type Props = {
  post: Post;
  liked: boolean;
  onLike: () => void;
  onComment: () => void;
};

export function PostCard({ post, liked, onLike, onComment }: Props) {
  const heartScale = useSharedValue(1);
  const heartStyle = useAnimatedStyle(() => ({ transform: [{ scale: heartScale.get() }] }));

  const handleLike = () => {
    if (!liked) {
      heartScale.set(withSequence(withTiming(1.3, { duration: 120 }), withSpring(1)));
    }
    onLike();
  };

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarLetter}>{post.authorName.slice(0, 1).toUpperCase()}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.username}>{post.authorName}</Text>
          <Text style={styles.meta}>
            {post.car} · {timeAgo(post.createdAt)}
          </Text>
        </View>
      </View>
      <Image source={{ uri: post.imageUri }} style={styles.photo} contentFit="cover" />
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
      </View>
      {post.caption ? (
        <Text style={styles.caption}>
          <Text style={styles.username}>{post.authorName} </Text>
          {post.caption}
        </Text>
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
    backgroundColor: Colors.light.card,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.light.border,
    paddingBottom: 16,
    marginBottom: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.light.avatar,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLetter: {
    color: Colors.light.tint,
    fontWeight: '700',
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
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
    paddingHorizontal: 14,
    paddingTop: 10,
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
  viewComments: {
    color: Colors.light.muted,
    paddingHorizontal: 14,
    paddingTop: 6,
  },
});
