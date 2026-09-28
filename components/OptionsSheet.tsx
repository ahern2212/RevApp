import Ionicons from '@expo/vector-icons/Ionicons';
import { BlurView } from 'expo-blur';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Colors from '@/constants/Colors';
import { blurTint } from '@/constants/glass';

// Wait for the sheet's slide-out before acting: iOS drops alerts presented mid-dismissal.
const CLOSE_MS = 300;

export type SheetOption = {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  destructive?: boolean;
};

type Props = {
  visible: boolean;
  options: SheetOption[];
  onClose: () => void;
  /** Optional question shown above the options, e.g. "Why are you reporting this post?" */
  title?: string;
};

/** Bottom sheet of actions (works on iOS, Android and web). */
export function OptionsSheet({ visible, options, onClose, title }: Props) {
  const { bottom } = useSafeAreaInsets();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Close menu" />
      <View style={[styles.sheet, { paddingBottom: bottom + 12 }]}>
        <BlurView intensity={70} tint={blurTint} style={StyleSheet.absoluteFill} />
        <View style={styles.grabber} />
        {title ? <Text style={styles.title}>{title}</Text> : null}
        {options.map((option) => (
          <Pressable
            key={option.label}
            onPress={() => {
              onClose();
              setTimeout(option.onPress, CLOSE_MS);
            }}
            accessibilityRole="button"
            style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
            <Ionicons
              name={option.icon}
              size={22}
              color={option.destructive ? Colors.light.danger : Colors.light.text}
            />
            <Text style={[styles.label, option.destructive && styles.destructive]}>
              {option.label}
            </Text>
          </Pressable>
        ))}
        <Pressable
          onPress={onClose}
          accessibilityRole="button"
          style={({ pressed }) => [styles.cancel, pressed && styles.pressed]}>
          <Text style={styles.cancelText}>Cancel</Text>
        </Pressable>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(45, 31, 71, 0.35)',
  },
  sheet: {
    backgroundColor: Colors.light.card,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: Colors.light.glassBorder,
    overflow: 'hidden',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 8,
    width: '100%',
    maxWidth: 640,
    alignSelf: 'center',
  },
  grabber: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.light.border,
    marginBottom: 8,
  },
  title: {
    color: Colors.light.muted,
    fontWeight: '700',
    textAlign: 'center',
    paddingVertical: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 14,
    paddingHorizontal: 8,
    borderRadius: 12,
  },
  pressed: {
    backgroundColor: Colors.light.card,
  },
  label: {
    color: Colors.light.text,
    fontSize: 16,
    fontWeight: '600',
  },
  destructive: {
    color: Colors.light.danger,
  },
  cancel: {
    marginTop: 6,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  cancelText: {
    color: Colors.light.text,
    fontWeight: '700',
    fontSize: 16,
  },
});
