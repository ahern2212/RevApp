import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import Colors from '@/constants/Colors';
import { glass } from '@/constants/glass';
import { fetchPost } from '@/lib/posts';
import type { Post } from '@/types';

// Posts already loaded in this session, so scrolling a chat doesn't refetch them.
const cache = new Map<string, Post | null>();

/** A post sent in a chat: thumbnail, author and caption; tapping opens the post. */
export function SharedPost({ postId }: { postId: string }) {
  const router = useRouter();
  const [loaded, setLoaded] = useState<{ postId: string; post: Post | null } | null>(
    cache.has(postId) ? { postId, post: cache.get(postId) ?? null } : null
  );
  const post = loaded?.postId === postId ? loaded.post : undefined;

  useEffect(() => {
    if (cache.has(postId)) return;
    let cancelled = false;
    fetchPost(postId)
      .then((next) => {
        cache.set(postId, next);
        if (!cancelled) setLoaded({ postId, post: next });
      })
      .catch((error) => console.warn('Failed to load shared post', error));
    return () => {
      cancelled = true;
    };
  }, [postId]);

  if (post === null) {
    return (
      <View style={[styles.card, styles.unavailable]}>
        <Ionicons name="eye-off-outline" size={18} color={Colors.light.muted} />
        <Text style={styles.muted}>Post unavailable</Text>
      </View>
    );
  }

  return (
    <Pressable
      onPress={() => router.push({ pathname: '/comments/[postId]', params: { postId } })}
      accessibilityRole="link"
      accessibilityLabel={post ? `Post by ${post.authorName}` : 'Shared post'}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
      {post ? (
        <>
          <Text style={styles.author}>@{post.authorName}</Text>
          <View>
            <Image source={{ uri: post.imageUri }} style={styles.image} contentFit="cover" transition={150} />
            {post.videoUri || post.imageUris.length > 1 ? (
              <Ionicons
                name={post.videoUri ? 'play' : post.layout === 'grid' ? 'grid' : 'copy'}
                size={16}
                color="#ffffff"
                style={styles.kind}
              />
            ) : null}
          </View>
          {post.car || post.caption ? (
            <Text style={styles.caption} numberOfLines={2}>
              {post.car ? <Text style={styles.car}>{post.car} </Text> : null}
              {post.caption}
            </Text>
          ) : null}
        </>
      ) : (
        <View style={[styles.image, styles.placeholder]} />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    ...glass,
    shadowOpacity: 0,
    width: 220,
    borderRadius: 16,
    overflow: 'hidden',
  },
  pressed: {
    opacity: 0.85,
  },
  unavailable: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
  },
  muted: {
    color: Colors.light.muted,
  },
  author: {
    color: Colors.light.text,
    fontWeight: '800',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  image: {
    width: '100%',
    aspectRatio: 4 / 5,
    backgroundColor: Colors.light.imagePlaceholder,
  },
  placeholder: {
    width: 220,
  },
  kind: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
  caption: {
    color: Colors.light.text,
    paddingHorizontal: 12,
    paddingVertical: 8,
    lineHeight: 18,
  },
  car: {
    fontWeight: '800',
  },
});
