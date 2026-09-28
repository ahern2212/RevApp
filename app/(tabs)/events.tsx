import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Chip } from '@/components/Chip';
import { PressableScale } from '@/components/PressableScale';
import { TileMap } from '@/components/TileMap';
import Colors from '@/constants/Colors';
import { GlassBackdrop } from '@/components/GlassBackdrop';
import { glass } from '@/constants/glass';
import { useGarage } from '@/context/GarageContext';
import { type CarEvent, fetchPastEvents, fetchUpcomingEvents, formatEventTime } from '@/lib/events';
import { useTabBarSpace } from '@/lib/layout';

type Tab = 'upcoming' | 'past';

export default function EventsScreen() {
  const router = useRouter();
  const { user } = useGarage();
  const tabBarSpace = useTabBarSpace();
  const { top } = useSafeAreaInsets();
  const [tab, setTab] = useState<Tab>('upcoming');
  // Each tab keeps its own list, so switching back is instant.
  const [lists, setLists] = useState<Record<Tab, CarEvent[] | null>>({ upcoming: null, past: null });
  const [failed, setFailed] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const events = lists[tab];
  const isPast = tab === 'past';

  const load = useCallback(async () => {
    try {
      const next = tab === 'past' ? await fetchPastEvents() : await fetchUpcomingEvents();
      setLists((current) => ({ ...current, [tab]: next }));
      setFailed(false);
    } catch (error) {
      console.warn('Failed to load events', error);
      setFailed(true);
      setLists((current) => ({ ...current, [tab]: current[tab] ?? [] }));
    }
  }, [tab]);

  const switchTab = (next: Tab) => {
    setTab(next);
    setSelectedId(null);
  };

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
    <View style={styles.screen}>
      <GlassBackdrop />
      <ScrollView
      style={styles.wrap}
      contentContainerStyle={[styles.content, { paddingTop: top + 16, paddingBottom: tabBarSpace }]}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.light.tint} />
      }>
      <View style={styles.titleRow}>
        <View style={styles.titleText}>
          <Text style={styles.title}>Car meets</Text>
          <Text style={styles.subtitle}>Find a meet near you or host your own.</Text>
        </View>
        <PressableScale
          onPress={() => router.push('/events/new')}
          accessibilityRole="button"
          style={styles.host}>
          <Ionicons name="add" size={18} color={Colors.light.onTint} />
          <Text style={styles.hostText}>Host a meet</Text>
        </PressableScale>
      </View>

      <View style={styles.tabs} accessibilityRole="tablist">
        <Chip label="Upcoming" icon="calendar-outline" active={!isPast} onPress={() => switchTab('upcoming')} />
        <Chip label="Past" icon="time-outline" active={isPast} onPress={() => switchTab('past')} />
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
          <Text style={styles.emptyTitle}>{isPast ? 'No past meets yet' : 'No upcoming meets'}</Text>
          <Text style={styles.emptyText}>
            {isPast
              ? 'Meets show up here once they’re over, with the photos people posted from them.'
              : 'Be the first — tap “Host a meet” to put one on the map.'}
          </Text>
        </View>
      ) : (
        <View style={styles.list}>
          {list.map((event, index) => {
            const date = new Date(event.startsAt);
            const going = !!user && event.goingIds.includes(user.id);
            const selected = event.id === selectedId;
            return (
              <Animated.View
                key={`${tab}-${event.id}`}
                entering={FadeInDown.delay(Math.min(index, 8) * 50).duration(350)}>
              <PressableScale
                onPress={() => open(event.id)}
                accessibilityRole="button"
                scaleTo={0.97}
                style={[styles.card, selected && styles.cardSelected, isPast && styles.cardPast]}>
                <View style={[styles.dateBadge, isPast && styles.dateBadgePast]}>
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
                    {isPast ? (going ? 'you went' : 'went') : going ? 'you’re going' : 'going'}
                  </Text>
                </View>
              </PressableScale>
              </Animated.View>
            );
          })}
        </View>
      )}
    </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  wrap: {
    flex: 1,
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
  tabs: {
    flexDirection: 'row',
    gap: 8,
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
    ...glass,
  },
  cardSelected: {
    borderColor: Colors.light.tint,
    borderWidth: 2,
  },
  cardPast: {
    opacity: 0.85,
  },
  dateBadgePast: {
    backgroundColor: Colors.light.border,
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
