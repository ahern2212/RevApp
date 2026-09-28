import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, Text } from 'react-native';
import Animated from 'react-native-reanimated';

import { PressableScale } from '@/components/PressableScale';
import Colors from '@/constants/Colors';

type Props = {
  label: string;
  onPress: () => void;
  active?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
};

/** Pill-shaped toggle used for filters and pickers across the app. Fades between states. */
export function Chip({ label, onPress, active = false, icon }: Props) {
  return (
    <PressableScale
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      scaleTo={0.93}>
      <Animated.View style={[styles.chip, active && styles.active]}>
        {icon ? <Ionicons name={icon} size={14} color={active ? Colors.light.onTint : Colors.light.tint} /> : null}
        <Text style={[styles.text, active && styles.textActive]}>{label}</Text>
      </Animated.View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderWidth: 1,
    borderColor: Colors.light.tint,
    backgroundColor: Colors.light.card,
    borderRadius: 999,
    paddingHorizontal: 13,
    paddingVertical: 7,
    // Reanimated CSS transition: the fill eases in and out when the chip is toggled.
    transitionProperty: 'backgroundColor',
    transitionDuration: 180,
  },
  active: {
    backgroundColor: Colors.light.tint,
  },
  text: {
    color: Colors.light.tint,
    fontWeight: '700',
  },
  textActive: {
    color: Colors.light.onTint,
  },
});
