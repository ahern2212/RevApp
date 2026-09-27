import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, Text } from 'react-native';

import Colors from '@/constants/Colors';

type Props = {
  label: string;
  onPress: () => void;
  active?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
};

/** Pill-shaped toggle used for filters and pickers across the app. */
export function Chip({ label, onPress, active = false, icon }: Props) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      style={[styles.chip, active && styles.active]}>
      {icon ? <Ionicons name={icon} size={14} color={active ? Colors.light.onTint : Colors.light.tint} /> : null}
      <Text style={[styles.text, active && styles.textActive]}>{label}</Text>
    </Pressable>
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
