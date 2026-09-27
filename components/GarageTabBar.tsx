import Ionicons from '@expo/vector-icons/Ionicons';
import { BlurView } from 'expo-blur';
import type { BottomTabBarProps } from 'expo-router/tabs';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';

import Colors, { art } from '@/constants/Colors';

const BAR_HEIGHT = 58;
const POST_SIZE = 62;
const POST_ROUTE = 'post';

type Route = BottomTabBarProps['state']['routes'][number];

/**
 * Tab bar with the Post tab as a big raised button in the exact center; the other tabs are
 * split evenly into the space on either side.
 */
export function GarageTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const { bottom } = useSafeAreaInsets();
  const postIndex = state.routes.findIndex((route) => route.name === POST_ROUTE);
  const left = state.routes.slice(0, postIndex);
  const right = state.routes.slice(postIndex + 1);

  const press = (route: Route, focused: boolean) => {
    // Emitting tabPress keeps React Navigation features working (e.g. tap Feed to scroll up).
    const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
    if (!focused && !event.defaultPrevented) navigation.navigate(route.name, route.params);
  };

  const renderTab = (route: Route) => {
    const index = state.routes.indexOf(route);
    const focused = state.index === index;
    const { options } = descriptors[route.key];
    const color = focused ? Colors.light.tint : Colors.light.tabIconDefault;
    const label = options.title ?? route.name;
    return (
      <Pressable
        key={route.key}
        onPress={() => press(route, focused)}
        onLongPress={() => navigation.emit({ type: 'tabLongPress', target: route.key })}
        accessibilityRole="tab"
        accessibilityState={{ selected: focused }}
        accessibilityLabel={label}
        style={styles.tab}>
        {options.tabBarIcon?.({ focused, color, size: 24 })}
        <Text style={[styles.label, { color }]} numberOfLines={1}>
          {label}
        </Text>
      </Pressable>
    );
  };

  const postRoute = state.routes[postIndex];

  return (
    <View style={[styles.bar, { height: BAR_HEIGHT + bottom, paddingBottom: bottom }]}>
      <BlurView intensity={80} tint="light" style={StyleSheet.absoluteFill} />
      <View style={styles.side}>{left.map(renderTab)}</View>
      {postRoute ? (
        <PostButton
          focused={state.index === postIndex}
          onPress={() => press(postRoute, state.index === postIndex)}
        />
      ) : null}
      <View style={styles.side}>{right.map(renderTab)}</View>
    </View>
  );
}

function PostButton({ focused, onPress }: { focused: boolean; onPress: () => void }) {
  const scale = useSharedValue(1);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.get() }] }));

  return (
    <View style={styles.postSlot}>
      <Pressable
        onPress={onPress}
        onPressIn={() => scale.set(withSpring(0.9, { damping: 15, stiffness: 300 }))}
        onPressOut={() => scale.set(withSpring(1, { damping: 10, stiffness: 220 }))}
        accessibilityRole="tab"
        accessibilityState={{ selected: focused }}
        accessibilityLabel="New post"
        hitSlop={6}>
        {/* Outer layer carries the glow (iOS drops shadows on clipped views); inner clips. */}
        <Animated.View style={[styles.postGlow, style]}>
          <View style={styles.postButton}>
            <Svg width={POST_SIZE} height={POST_SIZE} style={StyleSheet.absoluteFill}>
              <Defs>
                <LinearGradient id="postButton" x1="0" y1="0" x2="1" y2="1">
                  <Stop offset="0" stopColor={art.buttonFrom} />
                  <Stop offset="0.45" stopColor={Colors.light.tint} />
                  <Stop offset="1" stopColor={art.buttonTo} />
                </LinearGradient>
              </Defs>
              <Circle cx={POST_SIZE / 2} cy={POST_SIZE / 2} r={POST_SIZE / 2} fill="url(#postButton)" />
              {/* Glossy highlight across the top */}
              <Circle cx={POST_SIZE / 2} cy={POST_SIZE * 0.2} r={POST_SIZE * 0.36} fill="#ffffff" opacity={0.14} />
            </Svg>
            <Ionicons name="add" size={36} color={Colors.light.onTint} />
          </View>
        </Animated.View>
      </Pressable>
      <Text style={[styles.postLabel, focused && styles.postLabelActive]}>Post</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.light.border,
    backgroundColor: 'rgba(229, 234, 245, 0.55)',
  },
  side: {
    flex: 1,
    flexDirection: 'row',
  },
  tab: {
    flex: 1,
    height: BAR_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  label: {
    fontSize: 10,
    fontWeight: '600',
  },
  postSlot: {
    width: POST_SIZE + 24,
    alignItems: 'center',
    // Lift the button so it floats above the bar.
    marginTop: -POST_SIZE / 2 + 4,
  },
  postGlow: {
    width: POST_SIZE,
    height: POST_SIZE,
    borderRadius: POST_SIZE / 2,
    shadowColor: Colors.light.tint,
    shadowOpacity: 0.55,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 12,
    backgroundColor: Colors.light.tint,
  },
  postButton: {
    flex: 1,
    borderRadius: POST_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: '#ffffff',
    overflow: 'hidden',
  },
  postLabel: {
    marginTop: 2,
    fontSize: 10,
    fontWeight: '800',
    color: Colors.light.tint,
    letterSpacing: 0.5,
  },
  postLabelActive: {
    color: Colors.light.text,
  },
});
