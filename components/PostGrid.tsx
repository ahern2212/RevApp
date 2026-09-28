import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import Colors from '@/constants/Colors';
import type { Post } from '@/types';

type Props = {
  posts: Post[];
  emptyText: string;
};

/** Three-column photo grid; tapping a photo opens the post with its comments. Tiles fade in. */
export function PostGrid({ posts, emptyText }: Props) {
  const router = useRouter();

  if (posts.length === 0) {
    return <Text style={styles.empty}>{emptyText}</Text>;
  }

  return (
    <View style={styles.grid}>
      {posts.map((post, index) => (
        <Animated.View
          key={post.id}
          entering={FadeIn.delay(Math.min(index, 11) * 35).duration(300)}
          style={styles.tile}>
          <Pressable
            onPress={() =>
              router.push({ pathname: '/comments/[postId]', params: { postId: post.id } })
            }
            accessibilityRole="button"
            accessibilityLabel={`Open ${post.videoUri ? 'video' : 'post'}${post.car ? `: ${post.car}` : ''}`}
            style={({ pressed }) => [styles.fill, pressed && styles.pressed]}>
            <Image
              source={{ uri: post.imageUri }}
              style={styles.fill}
              contentFit="cover"
              transition={150}
            />
            {post.videoUri || post.imageUris.length > 1 ? (
              <Ionicons
                name={post.videoUri ? 'play' : post.layout === 'grid' ? 'grid' : 'copy'}
                size={16}
                color="#ffffff"
                style={styles.videoIcon}
              />
            ) : null}
          </Pressable>
        </Animated.View>
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
  fill: {
    width: '100%',
    height: '100%',
  },
  videoIcon: {
    position: 'absolute',
    top: 6,
    right: 6,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  empty: {
    color: Colors.light.muted,
    marginTop: 24,
    lineHeight: 22,
    textAlign: 'center',
  },
});
