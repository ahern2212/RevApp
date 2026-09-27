import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Avatar } from '@/components/Avatar';
import { GlassBackdrop } from '@/components/GlassBackdrop';
import { PostGrid } from '@/components/PostGrid';
import Colors from '@/constants/Colors';
import { glass } from '@/constants/glass';
import { useGarage } from '@/context/GarageContext';
import { useProfile } from '@/context/ProfilesContext';
import { type Car, carTitle, fetchCar } from '@/lib/cars';
import { fetchCarPosts } from '@/lib/posts';
import type { Post } from '@/types';

type Loaded = { carId: string; car: Car | null; posts: Post[] };

/** One garage car: its photo, mods, owner, and every post it's tagged in (a build log). */
export default function CarScreen() {
  const { carId } = useLocalSearchParams<{ carId: string }>();
  const router = useRouter();
  const { user } = useGarage();
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const current = loaded?.carId === carId ? loaded : null;
  const owner = useProfile(current?.car?.ownerId);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      Promise.all([fetchCar(carId), fetchCarPosts(carId)])
        .then(([car, posts]) => !cancelled && setLoaded({ carId, car, posts }))
        .catch((error) => {
          console.warn('Failed to load car', error);
          if (!cancelled) setLoaded({ carId, car: null, posts: [] });
        });
      return () => {
        cancelled = true;
      };
    }, [carId])
  );

  if (!current) {
    return (
      <View style={styles.screen}>
        <ActivityIndicator color={Colors.light.tint} style={styles.loading} />
      </View>
    );
  }
  const { car, posts } = current;
  if (!car) {
    return (
      <View style={styles.screen}>
        <Text style={styles.missing}>This car was removed from its garage.</Text>
      </View>
    );
  }

  const ownerName = owner?.username ?? 'driver';
  const mine = user?.id === car.ownerId;

  return (
    <View style={styles.screen}>
      <GlassBackdrop />
      <Stack.Screen options={{ title: car.nickname || carTitle(car) }} />
      <ScrollView style={styles.list} contentContainerStyle={styles.content}>
        {car.photoUri ? (
          <Image source={{ uri: car.photoUri }} style={styles.photo} contentFit="cover" transition={150} />
        ) : (
          <View style={[styles.photo, styles.noPhoto]}>
            <Ionicons name="car-sport-outline" size={48} color={Colors.light.tint} />
          </View>
        )}

        <View style={styles.card}>
          <Text style={styles.title}>{carTitle(car)}</Text>
          {car.nickname && car.nickname !== carTitle(car) ? (
            <Text style={styles.nickname}>“{car.nickname}”</Text>
          ) : null}
          <Pressable
            onPress={() =>
              router.push({ pathname: '/user/[userId]', params: { userId: car.ownerId, name: ownerName } })
            }
            accessibilityRole="link"
            style={styles.owner}>
            <Avatar name={ownerName} userId={car.ownerId} size={28} />
            <Text style={styles.ownerName}>@{ownerName}</Text>
          </Pressable>
          {car.mods ? (
            <>
              <Text style={styles.label}>Mods</Text>
              <Text style={styles.mods}>{car.mods}</Text>
            </>
          ) : null}
          {mine ? (
            <Pressable
              onPress={() => router.push({ pathname: '/garage/edit', params: { carId: car.id } })}
              accessibilityRole="button"
              style={styles.edit}>
              <Ionicons name="create-outline" size={16} color={Colors.light.tint} />
              <Text style={styles.editText}>Edit car</Text>
            </Pressable>
          ) : null}
        </View>

        <Text style={styles.heading}>Build log</Text>
        <PostGrid
          posts={posts}
          emptyText={
            mine
              ? 'Tag this car when you post (on the Post tab) to build its log here.'
              : 'No posts tagged with this car yet.'
          }
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
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
  photo: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: 16,
    backgroundColor: Colors.light.imagePlaceholder,
  },
  noPhoto: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    ...glass,
    borderRadius: 16,
    padding: 14,
    gap: 6,
  },
  title: {
    color: Colors.light.text,
    fontSize: 20,
    fontWeight: '900',
  },
  nickname: {
    color: Colors.light.muted,
    fontStyle: 'italic',
  },
  owner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  ownerName: {
    color: Colors.light.text,
    fontWeight: '700',
  },
  label: {
    color: Colors.light.muted,
    fontSize: 12,
    fontWeight: '800',
    marginTop: 6,
  },
  mods: {
    color: Colors.light.text,
    lineHeight: 20,
  },
  edit: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
  },
  editText: {
    color: Colors.light.tint,
    fontWeight: '800',
  },
  heading: {
    color: Colors.light.text,
    fontSize: 18,
    fontWeight: '900',
    marginTop: 8,
  },
});
