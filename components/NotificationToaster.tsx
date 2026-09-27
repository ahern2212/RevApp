import Ionicons from '@expo/vector-icons/Ionicons';
import { useAudioPlayer } from 'expo-audio';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInUp, FadeOutUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Colors from '@/constants/Colors';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';

const TOAST_MS = 4000;
const PREVIEW_LENGTH = 60;

const NOTIFICATION_SELECT =
  'id, type, post_id, actor:profiles!notifications_actor_id_fkey(username), comment:comments!notifications_comment_id_fkey(body)';

type NotificationRow = {
  id: string;
  type: 'like' | 'comment';
  post_id: string;
  actor: { username: string } | null;
  comment: { body: string } | null;
};

type Toast = { id: string; postId: string; text: string };

function describe(row: NotificationRow): string {
  const name = row.actor?.username ?? 'Someone';
  if (row.type === 'like') return `${name} liked your post`;
  const body = row.comment?.body ?? '';
  const preview = body.length > PREVIEW_LENGTH ? `${body.slice(0, PREVIEW_LENGTH)}…` : body;
  return preview ? `${name} commented: "${preview}"` : `${name} commented on your post`;
}

/** Listens for new likes/comments on the signed-in user's posts; honks and shows a banner. */
export function NotificationToaster() {
  const { user } = useAuth();
  const userId = user?.id;
  const router = useRouter();
  const { top } = useSafeAreaInsets();
  const horn = useAudioPlayer(require('@/assets/sounds/car_horn.wav'));
  const [toast, setToast] = useState<Toast | null>(null);

  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `recipient_id=eq.${userId}`,
        },
        async (payload) => {
          // The realtime payload has ids only; fetch the actor name and comment text.
          const { data, error } = await supabase
            .from('notifications')
            .select(NOTIFICATION_SELECT)
            .eq('id', (payload.new as { id: string }).id)
            .single();
          if (error || !data) return;
          const row = data as unknown as NotificationRow;
          setToast({ id: row.id, postId: row.post_id, text: describe(row) });
          horn.seekTo(0);
          horn.play();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, horn]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), TOAST_MS);
    return () => clearTimeout(timer);
  }, [toast]);

  if (!toast) return null;

  const open = () => {
    setToast(null);
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
        accessibilityLabel={`${toast.text}. Open post`}
        style={({ pressed }) => [styles.toast, pressed && styles.pressed]}>
        <View style={styles.icon}>
          <Ionicons name="car-sport" size={20} color={Colors.light.onTint} />
        </View>
        <Text style={styles.text} numberOfLines={2}>
          {toast.text}
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
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.light.border,
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
