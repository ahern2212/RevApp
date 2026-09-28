import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { useRef, useState } from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  type StyleProp,
  StyleSheet,
  Text,
  View,
  type ViewStyle,
} from 'react-native';

// A mouse can't swipe a scroll view, so the web gets arrow buttons.
const SHOW_ARROWS = Platform.OS === 'web';

type Props = {
  uris: string[];
  /** Size of the carousel, e.g. { width: '100%', aspectRatio: 4 / 5 }. */
  style?: StyleProp<ViewStyle>;
  onIndexChange?: (index: number) => void;
};

/** Swipeable photos with a "2/5" counter and page dots, like an Instagram carousel. */
export function MediaCarousel({ uris, style, onIndexChange }: Props) {
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [index, setIndex] = useState(0);
  const scrollRef = useRef<ScrollView>(null);

  const goTo = (next: number) => scrollRef.current?.scrollTo({ x: next * size.width, animated: true });

  return (
    <View
      style={[styles.frame, style]}
      onLayout={(event) => {
        const { width, height } = event.nativeEvent.layout;
        setSize({ width, height });
      }}>
      {size.width > 0 ? (
        <ScrollView
          ref={scrollRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          scrollEventThrottle={32}
          onScroll={(event) => {
            const next = Math.round(event.nativeEvent.contentOffset.x / size.width);
            if (next !== index && next >= 0 && next < uris.length) {
              setIndex(next);
              onIndexChange?.(next);
            }
          }}
          style={StyleSheet.absoluteFill}>
          {uris.map((uri, i) => (
            <Image
              key={uri}
              source={{ uri }}
              style={{ width: size.width, height: size.height }}
              contentFit="cover"
              transition={150}
              accessibilityLabel={`Photo ${i + 1} of ${uris.length}`}
            />
          ))}
        </ScrollView>
      ) : null}
      {SHOW_ARROWS && index > 0 ? (
        <Pressable
          onPress={() => goTo(index - 1)}
          accessibilityRole="button"
          accessibilityLabel="Previous photo"
          style={[styles.arrow, styles.arrowLeft]}>
          <Ionicons name="chevron-back" size={18} color="#ffffff" />
        </Pressable>
      ) : null}
      {SHOW_ARROWS && index < uris.length - 1 ? (
        <Pressable
          onPress={() => goTo(index + 1)}
          accessibilityRole="button"
          accessibilityLabel="Next photo"
          style={[styles.arrow, styles.arrowRight]}>
          <Ionicons name="chevron-forward" size={18} color="#ffffff" />
        </Pressable>
      ) : null}
      <View style={styles.counter} pointerEvents="none">
        <Text style={styles.counterText}>
          {index + 1}/{uris.length}
        </Text>
      </View>
      <View style={styles.dots} pointerEvents="none">
        {uris.map((uri, i) => (
          <View key={uri} style={[styles.dot, i === index && styles.dotActive]} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    overflow: 'hidden',
  },
  arrow: {
    position: 'absolute',
    top: '50%',
    marginTop: -16,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrowLeft: {
    left: 10,
  },
  arrowRight: {
    right: 10,
  },
  counter: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 3,
  },
  counterText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  dots: {
    position: 'absolute',
    bottom: 10,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 5,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
  },
  dotActive: {
    backgroundColor: '#ffffff',
  },
});
