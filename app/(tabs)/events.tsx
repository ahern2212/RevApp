import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { TileMap } from '@/components/TileMap';
import Colors from '@/constants/Colors';
import { useGarage } from '@/context/GarageContext';
import { type CarEvent, fetchUpcomingEvents, formatEventTime } from '@/lib/events';
import { useTabBarSpace } from '@/lib/layout';

export default function EventsScreen() {
  const router = useRouter();
  const { user } = useGarage();
  const tabBarSpace = useTabBarSpace();
  const [events, setEvents] = useState<CarEvent[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setEvents(await fetchUpcomingEvents());
      setFailed(false);
    } catch (error) {
      console.warn('Failed to load events', error);
      setFailed(true);
      setEvents((current) => current ?? []);
    }
  }, []);

  // Reload on every visit so new meets and RSVPs show up.
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const open = (eventId: string) =>
    router.push({ pathname: '/events/[eventId]', params: { eventId } });

  const list = events ?? [];

  return (
    <ScrollView
      style={styles.wrap}
      contentContainerStyle={[styles.content, { paddingBottom: tabBarSpace }]}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.light.tint} />
      }>
      <View style={styles.titleRow}>
        <View style={styles.titleText}>
          <Text style={styles.title}>Car meets</Text>
          <Text style={styles.subtitle}>Find a meet near you or host your own.</Text>
        </View>
        <Pressable
          onPress={() => router.push('/events/new')}
          accessibilityRole="button"
          style={({ pressed }) => [styles.host, pressed && styles.pressed]}>
          <Ionicons name="add" size={18} color={Colors.light.onTint} />
          <Text style={styles.hostText}>Host a meet</Text>
        </Pressable>
      </View>

      <TileMap
        height={230}
        markers={list.map((event) => ({
          id: event.id,
          latitude: event.latitude,
          longitude: event.longitude,
          label: `${event.title}, ${formatEventTime(event.startsAt)}`,
        }))}
        selectedId={selectedId}
        onMarkerPress={(id) => (id === selectedId ? open(id) : setSelectedId(id))}
      />
      {selectedId ? (
        <Text style={styles.mapHint}>Tap the pin again (or the card) to open the meet.</Text>
      ) : null}

      {events === null ? (
        <ActivityIndicator color={Colors.light.tint} style={styles.loading} />
      ) : failed && list.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="cloud-offline-outline" size={36} color={Colors.light.tint} />
          <Text style={styles.emptyTitle}>Couldn’t load meets</Text>
          <Text style={styles.emptyText}>
            Pull down to try again. If this keeps happening, the events database update may not be
            installed yet.
          </Text>
        </View>
      ) : list.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="car-sport-outline" size={40} color={Colors.light.tint} />
          <Text style={styles.emptyTitle}>No upcoming meets</Text>
          <Text style={styles.emptyText}>Be the first — tap “Host a meet” to put one on the map.</Text>
        </View>
      ) : (
        <View style={styles.list}>
          {list.map((event) => {
            const date = new Date(event.startsAt);
            const going = !!user && event.goingIds.includes(user.id);
            const selected = event.id === selectedId;
            return (
              <Pressable
                key={event.id}
                onPress={() => open(event.id)}
                accessibilityRole="button"
                style={({ pressed }) => [
                  styles.card,
                  selected && styles.cardSelected,
                  pressed && styles.pressed,
                ]}>
                <View style={styles.dateBadge}>
                  <Text style={styles.month}>
                    {date.toLocaleDateString(undefined, { month: 'short' }).toUpperCase()}
                  </Text>
                  <Text style={styles.day}>{date.getDate()}</Text>
                </View>
                <View style={styles.cardBody}>
                  <Text style={styles.cardTitle} numberOfLines={1}>
                    {event.title}
                  </Text>
                  <Text style={styles.cardMeta} numberOfLines={1}>
                    {formatEventTime(event.startsAt)}
                  </Text>
                  <Text style={styles.cardMeta} numberOfLines={1}>
                    <Ionicons name="location-outline" size={12} color={Colors.light.muted} />{' '}
                    {event.locationName}
                  </Text>
                </View>
                <View style={styles.goingCol}>
                  <Text style={[styles.goingCount, going && styles.goingYes]}>
                    {event.goingIds.length}
                  </Text>
                  <Text style={[styles.goingLabel, going && styles.goingYes]}>
                    {going ? 'you’re going' : 'going'}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  content: {
    padding: 16,
    gap: 12,
    maxWidth: 640,
    width: '100%',
    alignSelf: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  titleText: {
    flex: 1,
  },
  title: {
    color: Colors.light.text,
    fontSize: 24,
    fontWeight: '900',
  },
  subtitle: {
    color: Colors.light.muted,
    marginTop: 2,
  },
  host: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.light.tint,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  hostText: {
    color: Colors.light.onTint,
    fontWeight: '800',
  },
  pressed: {
    opacity: 0.8,
  },
  mapHint: {
    color: Colors.light.muted,
    fontSize: 12,
    textAlign: 'center',
    marginTop: -4,
  },
  loading: {
    marginTop: 24,
  },
  empty: {
    alignItems: 'center',
    gap: 8,
    marginTop: 24,
    paddingHorizontal: 24,
  },
  emptyTitle: {
    color: Colors.light.text,
    fontSize: 18,
    fontWeight: '800',
  },
  emptyText: {
    color: Colors.light.muted,
    textAlign: 'center',
    lineHeight: 20,
  },
  list: {
    gap: 10,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 14,
    backgroundColor: Colors.light.card,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  cardSelected: {
    borderColor: Colors.light.tint,
    borderWidth: 2,
  },
  dateBadge: {
    width: 52,
    height: 56,
    borderRadius: 12,
    backgroundColor: Colors.light.avatar,
    alignItems: 'center',
    justifyContent: 'center',
  },
  month: {
    color: Colors.light.tint,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
  },
  day: {
    color: Colors.light.text,
    fontSize: 22,
    fontWeight: '900',
  },
  cardBody: {
    flex: 1,
    gap: 2,
  },
  cardTitle: {
    color: Colors.light.text,
    fontSize: 16,
    fontWeight: '800',
  },
  cardMeta: {
    color: Colors.light.muted,
    fontSize: 13,
  },
  goingCol: {
    alignItems: 'center',
    minWidth: 56,
  },
  goingCount: {
    color: Colors.light.text,
    fontSize: 18,
    fontWeight: '900',
  },
  goingLabel: {
    color: Colors.light.muted,
    fontSize: 11,
    fontWeight: '600',
  },
  goingYes: {
    color: Colors.light.tint,
  },
});
