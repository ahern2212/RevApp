import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { css, FadeIn, FadeInDown, FadeOut } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { FeaturedPhoto } from '@/lib/featured';

const SLIDE_MS = 5000;
const FADE_MS = 1200;

/**
 * Full-screen slideshow of featured cars: each photo slowly zooms in (a CSS keyframe
 * animation) and crossfades into the next. Purely decorative; it ignores touches.
 */
export function FeaturedSlideshow({ photos }: { photos: FeaturedPhoto[] }) {
  const { bottom } = useSafeAreaInsets();
  const [index, setIndex] = useState(0);
  const count = photos.length;

  useEffect(() => {
    if (count < 2) return;
    const timer = setInterval(() => setIndex((current) => (current + 1) % count), SLIDE_MS);
    return () => clearInterval(timer);
  }, [count]);

  // Load the next photo while this one is showing, so the crossfade never waits.
  useEffect(() => {
    const next = photos[(index + 1) % count];
    if (next) Image.prefetch(next.uri).catch(() => {});
  }, [index, count, photos]);

  const photo = photos[index % count];
  if (!photo) return null;

  return (
    <View style={[StyleSheet.absoluteFill, styles.passThrough]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Animated.View
        key={`${index}-${photo.uri}`}
        entering={FadeIn.duration(FADE_MS)}
        exiting={FadeOut.duration(FADE_MS)}
        style={StyleSheet.absoluteFill}>
        <Animated.View style={[StyleSheet.absoluteFill, motion.zoom]}>
          <Image source={{ uri: photo.uri }} style={StyleSheet.absoluteFill} contentFit="cover" />
        </Animated.View>
      </Animated.View>
      <View style={styles.shade} />
      {photo.title ? (
        <Animated.View
          key={`caption-${index}`}
          entering={FadeInDown.delay(400).duration(500)}
          exiting={FadeOut.duration(300)}
          style={[styles.caption, { bottom: bottom + 20 }]}>
          <Ionicons name="trophy" size={14} color="#ffffff" />
          <Text style={styles.captionText} numberOfLines={1}>
            Featured · {photo.title}
          </Text>
        </Animated.View>
      ) : null}
    </View>
  );
}

// Slow "Ken Burns" push-in over each slide's lifetime (Reanimated CSS keyframes; css.create
// so it works on the web too).
const motion = css.create({
  zoom: {
    animationName: {
      from: { transform: [{ scale: 1 }] },
      to: { transform: [{ scale: 1.12 }] },
    },
    animationDuration: SLIDE_MS + FADE_MS,
    animationTimingFunction: 'linear',
    animationFillMode: 'forwards',
  },
});

const styles = StyleSheet.create({
  passThrough: {
    pointerEvents: 'none',
  },
  shade: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(10, 8, 20, 0.35)',
  },
  caption: {
    position: 'absolute',
    left: 20,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  captionText: {
    color: '#ffffff',
    fontWeight: '800',
    textShadowColor: 'rgba(0, 0, 0, 0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
});
