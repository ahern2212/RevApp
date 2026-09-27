import { Image } from 'expo-image';
import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import Colors from '@/constants/Colors';
import type { Post } from '@/types';

type Props = {
  post: Post;
  liked: boolean;
  onLike: () => void;
};

function timeAgo(timestamp: number) {
  const mins = Math.max(1, Math.round((Date.now() - timestamp) / 60000));
  if (mins < 60) return `${mins}m`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.round(hours / 24)}d`;
}

export function PostCard({ post, liked, onLike }: Props) {
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
        <Pressable onPress={onLike} hitSlop={8} style={styles.likeButton}>
          <SymbolView
            name={{ ios: liked ? 'heart.fill' : 'heart', android: 'favorite', web: 'favorite' }}
            tintColor={liked ? Colors.light.tint : Colors.light.text}
            size={26}
          />
          <Text style={[styles.likeCount, liked && { color: Colors.light.tint }]}>
            {post.likedBy.length}
          </Text>
        </Pressable>
      </View>
      {post.caption ? (
        <Text style={styles.caption}>
          <Text style={styles.username}>{post.authorName} </Text>
          {post.caption}
        </Text>
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
    paddingHorizontal: 14,
    paddingTop: 10,
  },
  likeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  likeCount: {
    color: Colors.light.text,
    fontWeight: '600',
  },
  caption: {
    color: Colors.light.text,
    paddingHorizontal: 14,
    paddingTop: 8,
    lineHeight: 20,
  },
});
