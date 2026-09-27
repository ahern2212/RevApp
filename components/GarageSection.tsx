import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import Colors from '@/constants/Colors';
import { glass } from '@/constants/glass';
import { type Car, carTitle, fetchCars } from '@/lib/cars';

function CarCard({ car, editable }: { car: Car; editable: boolean }) {
  const router = useRouter();
  const edit = () => router.push({ pathname: '/garage/edit', params: { carId: car.id } });

  return (
    <View style={styles.card}>
      {car.photoUri ? (
        <Image
          source={{ uri: car.photoUri }}
          style={styles.photo}
          contentFit="cover"
          transition={150}
          accessibilityLabel={`Photo of ${carTitle(car)}`}
        />
      ) : (
        <Pressable
          onPress={editable ? edit : undefined}
          disabled={!editable}
          accessibilityRole={editable ? 'button' : undefined}
          accessibilityLabel={editable ? `Add a photo of ${carTitle(car)}` : undefined}
          style={styles.noPhoto}>
          <Ionicons name={editable ? 'camera-outline' : 'car-sport-outline'} size={36} color={Colors.light.tint} />
          {editable ? <Text style={styles.noPhotoText}>Add a photo</Text> : null}
        </Pressable>
      )}

      <View style={styles.info}>
        <View style={styles.titleRow}>
          <View style={styles.titleText}>
            <Text style={styles.title}>{carTitle(car)}</Text>
            {car.nickname && carTitle(car) !== car.nickname ? (
              <Text style={styles.nickname}>“{car.nickname}”</Text>
            ) : null}
          </View>
          {editable ? (
            <Pressable
              onPress={edit}
              accessibilityRole="button"
              accessibilityLabel={`Edit ${carTitle(car)}`}
              style={styles.edit}>
              <Ionicons name="create-outline" size={16} color={Colors.light.tint} />
              <Text style={styles.editText}>Edit</Text>
            </Pressable>
          ) : null}
        </View>
        {car.mods ? (
          <>
            <Text style={styles.modsLabel}>Mods</Text>
            <Text style={styles.mods}>{car.mods}</Text>
          </>
        ) : null}
      </View>
    </View>
  );
}

/** "Garage" block on a profile: the owner's cars with their photos. */
export function GarageSection({ ownerId, editable }: { ownerId: string; editable: boolean }) {
  const router = useRouter();
  const [cars, setCars] = useState<{ ownerId: string; list: Car[] } | null>(null);
  const [failed, setFailed] = useState(false);
  const list = cars?.ownerId === ownerId ? cars.list : null;

  // Reload whenever the profile is shown (e.g. after adding or editing a car).
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      fetchCars(ownerId)
        .then((next) => {
          if (cancelled) return;
          setCars({ ownerId, list: next });
          setFailed(false);
        })
        .catch((error) => {
          console.warn('Failed to load garage', error);
          if (!cancelled) setFailed(true);
        });
      return () => {
        cancelled = true;
      };
    }, [ownerId])
  );

  if (!editable && (!list || list.length === 0)) return null;

  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <Text style={styles.heading}>Garage</Text>
        {editable && list && list.length > 0 ? (
          <Pressable
            onPress={() => router.push('/garage/edit')}
            accessibilityRole="button"
            style={styles.add}>
            <Ionicons name="add" size={16} color={Colors.light.tint} />
            <Text style={styles.addText}>Add car</Text>
          </Pressable>
        ) : null}
      </View>

      {list && list.length > 0 ? (
        list.map((car) => <CarCard key={car.id} car={car} editable={editable} />)
      ) : failed ? (
        <Text style={styles.note}>Your garage needs the latest database update to load.</Text>
      ) : list ? (
        <Pressable
          onPress={() => router.push('/garage/edit')}
          accessibilityRole="button"
          style={({ pressed }) => [styles.empty, pressed && styles.pressed]}>
          <Ionicons name="car-sport-outline" size={44} color={Colors.light.tint} />
          <Text style={styles.emptyTitle}>Add your car</Text>
          <Text style={styles.emptyText}>Show off your ride with a photo and your list of mods.</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: 12,
    marginBottom: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  heading: {
    color: Colors.light.text,
    fontSize: 18,
    fontWeight: '900',
  },
  add: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  addText: {
    color: Colors.light.tint,
    fontWeight: '800',
  },
  card: {
    borderRadius: 16,
    ...glass,
    overflow: 'hidden',
  },
  photo: {
    width: '100%',
    aspectRatio: 16 / 9,
    backgroundColor: Colors.light.imagePlaceholder,
  },
  noPhoto: {
    aspectRatio: 16 / 9,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: Colors.light.imagePlaceholder,
  },
  noPhotoText: {
    color: Colors.light.tint,
    fontWeight: '800',
  },
  info: {
    padding: 14,
    gap: 8,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  titleText: {
    flex: 1,
  },
  title: {
    color: Colors.light.text,
    fontSize: 17,
    fontWeight: '900',
  },
  nickname: {
    color: Colors.light.muted,
    fontStyle: 'italic',
    marginTop: 2,
  },
  edit: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 2,
  },
  editText: {
    color: Colors.light.tint,
    fontWeight: '800',
  },
  modsLabel: {
    color: Colors.light.muted,
    fontSize: 12,
    fontWeight: '800',
    marginTop: 2,
  },
  mods: {
    color: Colors.light.text,
    lineHeight: 20,
  },
  note: {
    color: Colors.light.muted,
  },
  empty: {
    alignItems: 'center',
    gap: 6,
    padding: 24,
    borderRadius: 16,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: Colors.light.avatar,
    backgroundColor: Colors.light.card,
  },
  pressed: {
    opacity: 0.8,
  },
  emptyTitle: {
    color: Colors.light.tint,
    fontSize: 16,
    fontWeight: '900',
  },
  emptyText: {
    color: Colors.light.muted,
    textAlign: 'center',
    lineHeight: 19,
  },
});
