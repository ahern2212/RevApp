import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Avatar } from '@/components/Avatar';
import { CarRender } from '@/components/CarRender';
import Colors from '@/constants/Colors';
import { glass } from '@/constants/glass';
import { useProfile } from '@/context/ProfilesContext';
import { type Car, carTitle, fetchCarsForOwners } from '@/lib/cars';

function RideCard({ car, onPress }: { car: Car; onPress: () => void }) {
  const owner = useProfile(car.ownerId);
  const name = owner?.username ?? 'driver';
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="link"
      accessibilityLabel={`${carTitle(car)}, ${name}'s car`}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
      <View style={styles.stage}>
        <CarRender bodyStyle={car.bodyStyle} paint={car.paint} wheels={car.wheels} stance={car.stance} />
      </View>
      <Text style={styles.title} numberOfLines={1}>
        {carTitle(car)}
      </Text>
      {car.nickname ? (
        <Text style={styles.nickname} numberOfLines={1}>
          “{car.nickname}”
        </Text>
      ) : null}
      <View style={styles.owner}>
        <Avatar name={name} userId={car.ownerId} size={20} />
        <Text style={styles.ownerName} numberOfLines={1}>
          @{name}
        </Text>
      </View>
    </Pressable>
  );
}

/** Horizontal row of the garage cars belonging to everyone going to a meet. */
export function GoingCars({
  ownerIds,
  onOpenProfile,
}: {
  ownerIds: string[];
  onOpenProfile: (userId: string) => void;
}) {
  const key = [...ownerIds].sort().join(',');
  const [cars, setCars] = useState<{ key: string; list: Car[] } | null>(null);
  const list = cars?.key === key ? cars.list : null;

  useEffect(() => {
    let cancelled = false;
    fetchCarsForOwners(key ? key.split(',') : [])
      .then((next) => !cancelled && setCars({ key, list: next }))
      .catch((error) => {
        console.warn('Failed to load cars at the meet', error);
        if (!cancelled) setCars({ key, list: [] });
      });
    return () => {
      cancelled = true;
    };
  }, [key]);

  if (ownerIds.length === 0) return null;
  if (!list) return <ActivityIndicator color={Colors.light.tint} style={styles.loading} />;

  const drivers = new Set(list.map((car) => car.ownerId)).size;
  return (
    <View style={styles.section}>
      <Text style={styles.heading}>Rides rolling in</Text>
      <Text style={styles.subheading}>
        {list.length === 0
          ? 'Nobody going has added a car to their garage yet.'
          : `${list.length} ${list.length === 1 ? 'car' : 'cars'} from ${drivers} ${drivers === 1 ? 'driver' : 'drivers'}`}
      </Text>
      {list.length > 0 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
          {list.map((car) => (
            <RideCard key={car.id} car={car} onPress={() => onOpenProfile(car.ownerId)} />
          ))}
        </ScrollView>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  loading: {
    marginVertical: 12,
  },
  section: {
    gap: 6,
    marginTop: 8,
  },
  heading: {
    color: Colors.light.text,
    fontWeight: '800',
    fontSize: 16,
  },
  subheading: {
    color: Colors.light.muted,
    fontSize: 13,
  },
  row: {
    gap: 10,
    paddingVertical: 6,
    paddingRight: 8,
  },
  card: {
    ...glass,
    width: 200,
    borderRadius: 16,
    padding: 10,
    gap: 3,
  },
  pressed: {
    opacity: 0.85,
  },
  stage: {
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.35)',
    paddingHorizontal: 6,
    paddingVertical: 8,
    marginBottom: 4,
  },
  title: {
    color: Colors.light.text,
    fontWeight: '800',
  },
  nickname: {
    color: Colors.light.muted,
    fontStyle: 'italic',
    fontSize: 12,
  },
  owner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  ownerName: {
    flex: 1,
    color: Colors.light.text,
    fontWeight: '600',
    fontSize: 12,
  },
});
