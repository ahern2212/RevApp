import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import Colors from '@/constants/Colors';
import type { Post } from '@/types';

type Props = {
  posts: Post[];
  emptyText: string;
};

/** Three-column photo grid; tapping a photo opens the post with its comments. */
export function PostGrid({ posts, emptyText }: Props) {
  const router = useRouter();

  if (posts.length === 0) {
    return <Text style={styles.empty}>{emptyText}</Text>;
  }

  return (
    <View style={styles.grid}>
      {posts.map((post) => (
        <Pressable
          key={post.id}
          onPress={() =>
            router.push({ pathname: '/comments/[postId]', params: { postId: post.id } })
          }
          accessibilityRole="button"
          accessibilityLabel={`Open post${post.car ? `: ${post.car}` : ''}`}
          style={({ pressed }) => [styles.tile, pressed && styles.pressed]}>
          <Image
            source={{ uri: post.imageUri }}
            style={styles.image}
            contentFit="cover"
            transition={150}
          />
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  tile: {
    width: '32.6%',
    aspectRatio: 1,
    backgroundColor: Colors.light.imagePlaceholder,
  },
  pressed: {
    opacity: 0.8,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  empty: {
    color: Colors.light.muted,
    marginTop: 24,
    lineHeight: 22,
    textAlign: 'center',
  },
});
