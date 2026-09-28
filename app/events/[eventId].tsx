import Ionicons from '@expo/vector-icons/Ionicons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { Avatar } from '@/components/Avatar';
import { GoingCars } from '@/components/GoingCars';
import { PostGrid } from '@/components/PostGrid';
import { TileMap } from '@/components/TileMap';
import { GlassBackdrop } from '@/components/GlassBackdrop';
import Colors from '@/constants/Colors';
import { useGarage } from '@/context/GarageContext';
import { useProfile } from '@/context/ProfilesContext';
import { confirm, showError } from '@/lib/confirm';
import { type CarEvent, deleteEvent, fetchEvent, formatEventTime, setGoing } from '@/lib/events';
import { directionsUrl } from '@/lib/geo';
import { fetchEventPosts } from '@/lib/posts';
import type { Post } from '@/types';

const MAX_FACES = 8;

function GoingFace({ userId, onPress }: { userId: string; onPress: () => void }) {
  const profile = useProfile(userId);
  return (
    <Pressable onPress={onPress} accessibilityRole="link" accessibilityLabel={profile?.username}>
      <Avatar name={profile?.username ?? '?'} userId={userId} size={34} style={styles.face} />
    </Pressable>
  );
}

export default function EventScreen() {
  const { eventId } = useLocalSearchParams<{ eventId: string }>();
  const router = useRouter();
  const { user } = useGarage();
  const [loaded, setLoaded] = useState<{ id: string; event: CarEvent | null } | null>(null);
  const [saving, setSaving] = useState(false);
  const [now] = useState(() => Date.now()); // when the screen opened
  const event = loaded?.id === eventId ? loaded.event : undefined;
  const [photos, setPhotos] = useState<{ id: string; posts: Post[] } | null>(null);
  const meetPosts = photos?.id === eventId ? photos.posts : [];

  // Posts people tagged with this meet.
  useEffect(() => {
    let cancelled = false;
    fetchEventPosts(eventId)
      .then((posts) => !cancelled && setPhotos({ id: eventId, posts }))
      .catch((error) => console.warn('Failed to load meet photos', error));
    return () => {
      cancelled = true;
    };
  }, [eventId]);

  useEffect(() => {
    let cancelled = false;
    fetchEvent(eventId)
      .then((next) => !cancelled && setLoaded({ id: eventId, event: next }))
      .catch((error) => {
        console.warn('Failed to load event', error);
        if (!cancelled) setLoaded({ id: eventId, event: null });
      });
    return () => {
      cancelled = true;
    };
  }, [eventId]);

  if (event === undefined) {
    return (
      <View style={styles.wrap}>
        <ActivityIndicator color={Colors.light.tint} style={styles.loading} />
      </View>
    );
  }
  if (event === null) {
    return (
      <View style={styles.wrap}>
        <Text style={styles.missing}>This meet was deleted or couldn’t be loaded.</Text>
      </View>
    );
  }

  const userId = user?.id;
  const going = !!userId && event.goingIds.includes(userId);
  const isHost = userId === event.hostId;
  const past = event.startsAt < now;

  const openProfile = (id: string, name?: string) =>
    router.push({ pathname: '/user/[userId]', params: name ? { userId: id, name } : { userId: id } });

  const toggleGoing = async () => {
    if (!userId || saving) return;
    const next = !going;
    // Optimistic; roll back on failure.
    const apply = (isGoing: boolean) =>
      setLoaded({
        id: event.id,
        event: {
          ...event,
          goingIds: isGoing
            ? [...event.goingIds.filter((id) => id !== userId), userId]
            : event.goingIds.filter((id) => id !== userId),
        },
      });
    apply(next);
    setSaving(true);
    try {
      await setGoing(event.id, userId, next);
    } catch (error) {
      apply(!next);
      showError('Could not update RSVP', error);
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    const ok = await confirm('Delete this meet?', 'It will disappear from the map for everyone.', 'Delete');
    if (!ok) return;
    try {
      await deleteEvent(event.id);
      router.back();
    } catch (error) {
      showError('Could not delete', error);
    }
  };

  const directions = () =>
    Linking.openURL(directionsUrl(event, event.locationName, Platform.OS)).catch((error) =>
      showError('Could not open maps', error)
    );

  return (
    <View style={styles.screen}>
      <GlassBackdrop />
      <ScrollView style={styles.list} contentContainerStyle={styles.content}>
      <Stack.Screen options={{ title: event.title }} />
      <TileMap
        height={240}
        markers={[{ id: event.id, latitude: event.latitude, longitude: event.longitude, label: event.locationName }]}
      />

      <Text style={styles.title}>{event.title}</Text>

      <View style={styles.infoRow}>
        <Ionicons name="calendar-outline" size={18} color={Colors.light.tint} />
        <Text style={styles.info}>
          {formatEventTime(event.startsAt)}
          {past ? ' · happening now' : ''}
        </Text>
      </View>
      <View style={styles.infoRow}>
        <Ionicons name="location-outline" size={18} color={Colors.light.tint} />
        <Text style={styles.info}>{event.locationName}</Text>
      </View>

      <View style={styles.buttons}>
        <Pressable
          onPress={toggleGoing}
          accessibilityRole="button"
          accessibilityState={{ selected: going }}
          style={[styles.goingButton, going && styles.goingButtonOn]}>
          <Ionicons
            name={going ? 'checkmark-circle' : 'car-sport-outline'}
            size={18}
            color={going ? Colors.light.onTint : Colors.light.tint}
          />
          <Text style={[styles.goingText, going && styles.goingTextOn]}>
            {going ? 'You’re going' : 'I’m going'}
          </Text>
        </Pressable>
        <Pressable onPress={directions} accessibilityRole="link" style={styles.directions}>
          <Ionicons name="navigate-outline" size={18} color={Colors.light.text} />
          <Text style={styles.directionsText}>Directions</Text>
        </Pressable>
      </View>

      <Pressable
        onPress={() => openProfile(event.hostId, event.hostName)}
        accessibilityRole="link"
        style={styles.host}>
        <Avatar name={event.hostName} userId={event.hostId} size={40} />
        <View>
          <Text style={styles.hostLabel}>Hosted by</Text>
          <Text style={styles.hostName}>{event.hostName}</Text>
        </View>
      </Pressable>

      {event.description ? <Text style={styles.description}>{event.description}</Text> : null}

      <Text style={styles.section}>
        {event.goingIds.length} {event.goingIds.length === 1 ? 'driver' : 'drivers'} going
      </Text>
      {event.goingIds.length > 0 ? (
        <View style={styles.faces}>
          {event.goingIds.slice(0, MAX_FACES).map((id) => (
            <GoingFace key={id} userId={id} onPress={() => openProfile(id)} />
          ))}
          {event.goingIds.length > MAX_FACES ? (
            <Text style={styles.more}>+{event.goingIds.length - MAX_FACES}</Text>
          ) : null}
        </View>
      ) : (
        <Text style={styles.muted}>Be the first to say you’re going.</Text>
      )}

      <GoingCars ownerIds={event.goingIds} onOpenProfile={(id) => openProfile(id)} />

      {meetPosts.length > 0 || going || isHost ? (
        <View style={styles.photos}>
          <Text style={styles.photosTitle}>Photos from the meet</Text>
          <PostGrid
            posts={meetPosts}
            emptyText="Posting from the meet? Pick it under “At a meet?” on the Post tab."
          />
        </View>
      ) : null}

      {isHost ? (
        <Pressable onPress={remove} accessibilityRole="button" style={styles.delete}>
          <Ionicons name="trash-outline" size={16} color={Colors.light.danger} />
          <Text style={styles.deleteText}>Delete meet</Text>
        </Pressable>
      ) : null}
    </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  photos: {
    gap: 8,
    marginTop: 12,
  },
  photosTitle: {
    color: Colors.light.text,
    fontWeight: '800',
    fontSize: 16,
  },
  screen: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  wrap: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  list: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 48,
    gap: 12,
    maxWidth: 640,
    width: '100%',
    alignSelf: 'center',
  },
  loading: {
    marginTop: 48,
  },
  missing: {
    color: Colors.light.muted,
    textAlign: 'center',
    marginTop: 48,
    paddingHorizontal: 24,
  },
  title: {
    color: Colors.light.text,
    fontSize: 26,
    fontWeight: '900',
    marginTop: 4,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  info: {
    flex: 1,
    color: Colors.light.text,
    fontSize: 15,
    lineHeight: 20,
  },
  buttons: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  goingButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: 12,
    paddingVertical: 12,
    borderWidth: 2,
    borderColor: Colors.light.tint,
  },
  goingButtonOn: {
    backgroundColor: Colors.light.tint,
  },
  goingText: {
    color: Colors.light.tint,
    fontWeight: '800',
  },
  goingTextOn: {
    color: Colors.light.onTint,
  },
  directions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: Colors.light.border,
    backgroundColor: Colors.light.card,
  },
  directionsText: {
    color: Colors.light.text,
    fontWeight: '700',
  },
  host: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 4,
  },
  hostLabel: {
    color: Colors.light.muted,
    fontSize: 12,
  },
  hostName: {
    color: Colors.light.text,
    fontWeight: '800',
  },
  description: {
    color: Colors.light.text,
    lineHeight: 21,
  },
  section: {
    color: Colors.light.text,
    fontWeight: '800',
    fontSize: 16,
    marginTop: 8,
  },
  faces: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 6,
  },
  face: {
    borderWidth: 2,
    borderColor: Colors.light.background,
  },
  more: {
    color: Colors.light.muted,
    fontWeight: '700',
    marginLeft: 4,
  },
  muted: {
    color: Colors.light.muted,
  },
  delete: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    marginTop: 16,
    paddingVertical: 8,
  },
  deleteText: {
    color: Colors.light.danger,
    fontWeight: '700',
  },
});
