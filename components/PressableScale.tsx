import type { ComponentProps, ReactNode } from 'react';
import { type GestureResponderEvent, Pressable, type PressableProps } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
const SPRING = { damping: 15, stiffness: 320, mass: 0.6 };

type Props = Omit<PressableProps, 'style' | 'children'> & {
  /** Any style an Animated.View takes, including Reanimated CSS transitions. */
  style?: ComponentProps<typeof Animated.View>['style'];
  children?: ReactNode;
  /** How far it shrinks while pressed (1 = not at all). */
  scaleTo?: number;
};

/** A Pressable that springs down a little while it's held, instead of just dimming. */
export function PressableScale({ style, scaleTo = 0.95, onPressIn, onPressOut, children, ...rest }: Props) {
  const scale = useSharedValue(1);
  const animated = useAnimatedStyle(() => ({ transform: [{ scale: scale.get() }] }));

  return (
    <AnimatedPressable
      {...rest}
      onPressIn={(event: GestureResponderEvent) => {
        scale.set(withSpring(scaleTo, SPRING));
        onPressIn?.(event);
      }}
      onPressOut={(event: GestureResponderEvent) => {
        scale.set(withSpring(1, SPRING));
        onPressOut?.(event);
      }}
      style={[style, animated]}>
      {children}
    </AnimatedPressable>
  );
}
