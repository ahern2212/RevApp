import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { PressableScale } from '@/components/PressableScale';

import Colors from '@/constants/Colors';
import { glass } from '@/constants/glass';
import type { Post } from '@/types';

/** Compact card for the week's most-liked post, shown above the feed. */
export function CarOfTheWeek({ post, onPress }: { post: Post; onPress: () => void }) {
  const likes = post.likedBy.length;
  return (
    <Animated.View entering={FadeInDown.delay(80).duration(400)}>
    <PressableScale
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Car of the week: ${post.car || 'a build'} by ${post.authorName}, ${likes} likes`}
      scaleTo={0.97}
      style={styles.card}>
      <View>
        <Image source={{ uri: post.imageUri }} style={styles.thumb} contentFit="cover" transition={150} />
        {post.videoUri ? (
          <Ionicons name="play" size={14} color="#ffffff" style={styles.play} />
        ) : null}
      </View>
      <View style={styles.text}>
        <View style={styles.badge}>
          <Ionicons name="trophy" size={12} color={Colors.light.onTint} />
          <Text style={styles.badgeText}>Car of the week</Text>
        </View>
        <Text style={styles.title} numberOfLines={1}>
          {post.car || post.caption || 'Top build'}
        </Text>
        <Text style={styles.meta} numberOfLines={1}>
          @{post.authorName} · {likes} {likes === 1 ? 'like' : 'likes'}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={Colors.light.muted} />
    </PressableScale>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    ...glass,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 18,
    padding: 10,
    marginHorizontal: 10,
    marginBottom: 14,
  },
  thumb: {
    width: 64,
    height: 64,
    borderRadius: 12,
    backgroundColor: Colors.light.imagePlaceholder,
  },
  play: {
    position: 'absolute',
    top: 4,
    right: 4,
  },
  text: {
    flex: 1,
    gap: 3,
  },
  badge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.light.tint,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  badgeText: {
    color: Colors.light.onTint,
    fontSize: 11,
    fontWeight: '800',
  },
  title: {
    color: Colors.light.text,
    fontWeight: '800',
    fontSize: 15,
  },
  meta: {
    color: Colors.light.muted,
    fontSize: 12,
  },
});
