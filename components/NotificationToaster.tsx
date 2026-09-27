import Ionicons from '@expo/vector-icons/Ionicons';
import { useAudioPlayer } from 'expo-audio';
import { BlurView } from 'expo-blur';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInUp, FadeOutUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Colors from '@/constants/Colors';
import { blurTint } from '@/constants/glass';
import { useActivity } from '@/context/ActivityContext';
import { describeActivity } from '@/lib/activity';

const TOAST_MS = 4000;

/** Honks and shows a banner when someone likes or comments on the user's post while the app is open. */
export function NotificationToaster() {
  const { latest } = useActivity();
  const router = useRouter();
  const { top } = useSafeAreaInsets();
  const horn = useAudioPlayer(require('@/assets/sounds/car_horn.wav'));
  const [dismissedId, setDismissedId] = useState<string | null>(null);
  const toast = latest && latest.id !== dismissedId ? latest : null;
  const toastId = toast?.id;

  useEffect(() => {
    if (!toastId) return;
    horn.seekTo(0);
    horn.play();
    const timer = setTimeout(() => setDismissedId(toastId), TOAST_MS);
    return () => clearTimeout(timer);
  }, [toastId, horn]);

  if (!toast) return null;
  const text = describeActivity(toast);

  const open = () => {
    setDismissedId(toast.id);
    router.push({ pathname: '/comments/[postId]', params: { postId: toast.postId } });
  };

  return (
    <Animated.View
      key={toast.id}
      entering={FadeInUp}
      exiting={FadeOutUp}
      pointerEvents="box-none"
      style={[styles.wrap, { top: top + 8 }]}>
      <Pressable
        onPress={open}
        accessibilityRole="button"
        accessibilityLiveRegion="polite"
        accessibilityLabel={`${text}. Open post`}
        style={({ pressed }) => [styles.toast, pressed && styles.pressed]}>
        <BlurView intensity={60} tint={blurTint} style={StyleSheet.absoluteFill} />
        <View style={styles.icon}>
          <Ionicons name="car-sport" size={20} color={Colors.light.onTint} />
        </View>
        <Text style={styles.text} numberOfLines={2}>
          {text}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 12,
    right: 12,
    alignItems: 'center',
    zIndex: 1000,
    elevation: 1000,
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    width: '100%',
    maxWidth: 520,
    backgroundColor: Colors.light.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Colors.light.glassBorder,
    overflow: 'hidden',
    paddingVertical: 12,
    paddingHorizontal: 14,
    shadowColor: Colors.light.text,
    shadowOpacity: 0.18,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
  },
  pressed: {
    opacity: 0.85,
  },
  icon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.light.tint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    flex: 1,
    color: Colors.light.text,
    fontWeight: '600',
    lineHeight: 20,
  },
});
