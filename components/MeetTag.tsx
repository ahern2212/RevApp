import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';

import Colors from '@/constants/Colors';
import { fetchEvent } from '@/lib/events';

/** "📍 At Cars & Coffee" on a post tagged with a meet; opens the meet. */
export function MeetTag({ eventId }: { eventId: string }) {
  const router = useRouter();
  const [loaded, setLoaded] = useState<{ eventId: string; title: string | null } | null>(null);
  const title = loaded?.eventId === eventId ? loaded.title : undefined;

  useEffect(() => {
    let cancelled = false;
    fetchEvent(eventId)
      .then((event) => !cancelled && setLoaded({ eventId, title: event?.title ?? null }))
      .catch((error) => console.warn('Failed to load meet', error));
    return () => {
      cancelled = true;
    };
  }, [eventId]);

  // The meet was deleted: nothing to link to.
  if (title === null) return null;

  return (
    <Pressable
      onPress={() => router.push({ pathname: '/events/[eventId]', params: { eventId } })}
      accessibilityRole="link"
      style={styles.row}>
      <Ionicons name="location" size={15} color={Colors.light.tint} />
      <Text style={styles.text} numberOfLines={1}>
        At {title ?? 'a meet'}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 10,
  },
  text: {
    color: Colors.light.tint,
    fontWeight: '700',
  },
});
