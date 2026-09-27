import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import {
  BODY_STYLE_LABELS,
  CarRender,
  PAINT_COLORS,
  WHEEL_COLORS,
} from '@/components/CarRender';
import Colors from '@/constants/Colors';
import { type Car, carTitle, fetchCars } from '@/lib/cars';

const colorName = (list: { name: string; hex: string }[], hex: string) =>
  list.find((c) => c.hex.toLowerCase() === hex.toLowerCase())?.name ?? hex;

function CarCard({ car, editable }: { car: Car; editable: boolean }) {
  const router = useRouter();
  const [showPhoto, setShowPhoto] = useState(false);

  return (
    <View style={styles.card}>
      <View style={styles.stage}>
        {showPhoto && car.photoUri ? (
          <Image source={{ uri: car.photoUri }} style={styles.photo} contentFit="cover" transition={150} />
        ) : (
          <View style={styles.renderWrap}>
            <CarRender bodyStyle={car.bodyStyle} paint={car.paint} wheels={car.wheels} stance={car.stance} />
          </View>
        )}
        {car.photoUri ? (
          <View style={styles.toggle}>
            {(['Render', 'Photo'] as const).map((label) => {
              const active = (label === 'Photo') === showPhoto;
              return (
                <Pressable
                  key={label}
                  onPress={() => setShowPhoto(label === 'Photo')}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  style={[styles.toggleItem, active && styles.toggleActive]}>
                  <Text style={[styles.toggleText, active && styles.toggleTextActive]}>{label}</Text>
                </Pressable>
              );
            })}
          </View>
        ) : null}
      </View>

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
              onPress={() => router.push({ pathname: '/garage/edit', params: { carId: car.id } })}
              accessibilityRole="button"
              accessibilityLabel={`Edit ${carTitle(car)}`}
              style={styles.edit}>
              <Ionicons name="create-outline" size={16} color={Colors.light.tint} />
              <Text style={styles.editText}>Edit</Text>
            </Pressable>
          ) : null}
        </View>
        <View style={styles.tags}>
          <View style={styles.tag}>
            <View style={[styles.swatch, { backgroundColor: car.paint }]} />
            <Text style={styles.tagText}>{colorName(PAINT_COLORS, car.paint)}</Text>
          </View>
          <View style={styles.tag}>
            <Text style={styles.tagText}>{BODY_STYLE_LABELS[car.bodyStyle]}</Text>
          </View>
          {car.stance !== 'stock' ? (
            <View style={styles.tag}>
              <Text style={styles.tagText}>{car.stance === 'lowered' ? 'Lowered' : 'Lifted'}</Text>
            </View>
          ) : null}
          <View style={styles.tag}>
            <View style={[styles.swatch, { backgroundColor: car.wheels }]} />
            <Text style={styles.tagText}>{colorName(WHEEL_COLORS, car.wheels)} wheels</Text>
          </View>
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

/** "Garage" block on a profile: the owner's cars with their renders. */
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
          <View style={styles.emptyRender}>
            <CarRender bodyStyle="coupe" paint="#d0bdf4" wheels="#c0c4cc" stance="stock" />
          </View>
          <Text style={styles.emptyTitle}>Add your car</Text>
          <Text style={styles.emptyText}>
            Pick the body style, paint and wheels to get your own custom render.
          </Text>
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
    backgroundColor: Colors.light.card,
    borderWidth: 1,
    borderColor: Colors.light.border,
    overflow: 'hidden',
  },
  stage: {
    backgroundColor: '#f4f1fb',
    aspectRatio: 16 / 9,
    justifyContent: 'center',
  },
  renderWrap: {
    paddingHorizontal: 16,
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  toggle: {
    position: 'absolute',
    top: 10,
    right: 10,
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 999,
    padding: 2,
  },
  toggleItem: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  toggleActive: {
    backgroundColor: Colors.light.tint,
  },
  toggleText: {
    color: Colors.light.text,
    fontSize: 12,
    fontWeight: '700',
  },
  toggleTextActive: {
    color: Colors.light.onTint,
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
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: Colors.light.background,
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  swatch: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.15)',
  },
  tagText: {
    color: Colors.light.text,
    fontSize: 12,
    fontWeight: '600',
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
    padding: 16,
    borderRadius: 16,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: Colors.light.avatar,
    backgroundColor: Colors.light.card,
  },
  pressed: {
    opacity: 0.8,
  },
  emptyRender: {
    width: '70%',
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
