import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet } from 'react-native';
import Animated, { css } from 'react-native-reanimated';

import { PressableScale } from '@/components/PressableScale';
import Colors from '@/constants/Colors';
import { glass } from '@/constants/glass';

/**
 * Round refresh button whose arrow spins while `refreshing`. Pull-to-refresh doesn't exist
 * on the web, so this is how web users reload; it's handy on phones too.
 */
export function RefreshButton({ refreshing, onPress }: { refreshing: boolean; onPress: () => void }) {
  return (
    <PressableScale
      onPress={onPress}
      disabled={refreshing}
      accessibilityRole="button"
      accessibilityLabel={refreshing ? 'Refreshing' : 'Refresh'}
      accessibilityState={{ busy: refreshing }}
      scaleTo={0.9}
      style={styles.button}>
      <Animated.View style={refreshing ? motion.spinning : null}>
        <Ionicons name="refresh" size={18} color={Colors.light.tint} />
      </Animated.View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  button: {
    ...glass,
    shadowOpacity: 0,
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

// Reanimated CSS keyframes (css.create, not StyleSheet.create, so they work on the web too).
const motion = css.create({
  // One full turn every 0.8 s while refreshing.
  spinning: {
    animationName: {
      from: { transform: [{ rotate: '0deg' }] },
      to: { transform: [{ rotate: '360deg' }] },
    },
    animationDuration: 800,
    animationIterationCount: 'infinite',
    animationTimingFunction: 'linear',
  },
});
