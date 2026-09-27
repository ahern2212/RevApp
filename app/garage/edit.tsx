import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { CarDetailsInput } from '@/components/CarDetailsInput';
import { GlassBackdrop } from '@/components/GlassBackdrop';
import Colors from '@/constants/Colors';
import { glass } from '@/constants/glass';
import { useGarage } from '@/context/GarageContext';
import {
  type Car,
  type CarInput,
  deleteCar,
  fetchCar,
  MODS_MAX,
  NICKNAME_MAX,
  saveCar,
} from '@/lib/cars';
import { confirm, showError } from '@/lib/confirm';
import { type PickedMedia, pickPhoto } from '@/lib/media';

const BLANK: CarInput = { nickname: '', year: '', make: '', model: '', mods: '' };

export default function EditCarScreen() {
  const { carId } = useLocalSearchParams<{ carId?: string }>();
  const router = useRouter();
  const { user } = useGarage();
  const [existing, setExisting] = useState<{ id: string; car: Car | null } | null>(null);
  const [form, setForm] = useState<CarInput | null>(null);
  const [photo, setPhoto] = useState<PickedMedia | 'remove' | undefined>();
  const [busy, setBusy] = useState(false);

  const car = carId && existing?.id === carId ? existing.car : undefined;
  const loading = !!carId && existing?.id !== carId;
  // Until the user edits, show the saved car (or a blank one for a new car).
  const values: CarInput = form ?? (car ? { ...car } : BLANK);

  useEffect(() => {
    if (!carId) return;
    let cancelled = false;
    fetchCar(carId)
      .then((next) => !cancelled && setExisting({ id: carId, car: next }))
      .catch((error) => {
        console.warn('Failed to load car', error);
        if (!cancelled) setExisting({ id: carId, car: null });
      });
    return () => {
      cancelled = true;
    };
  }, [carId]);

  if (loading) {
    return (
      <View style={styles.wrap}>
        <ActivityIndicator color={Colors.light.tint} style={styles.loading} />
      </View>
    );
  }

  const update = (patch: Partial<CarInput>) => setForm({ ...values, ...patch });
  const photoUri = photo === 'remove' ? null : photo ? photo.uri : (car?.photoUri ?? null);

  const choosePhoto = async () => {
    try {
      const picked = await pickPhoto();
      if (picked) setPhoto(picked);
    } catch (error) {
      showError('Can’t use that photo', error);
    }
  };

  const save = async () => {
    if (!user) return;
    setBusy(true);
    try {
      await saveCar(user.id, values, photo, car ?? undefined);
      router.back();
    } catch (error) {
      showError('Could not save car', error);
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!car) return;
    if (!(await confirm('Remove this car?', 'It will be taken out of your garage.', 'Remove'))) return;
    setBusy(true);
    try {
      await deleteCar(car);
      router.back();
    } catch (error) {
      showError('Could not remove car', error);
      setBusy(false);
    }
  };

  return (
    <View style={styles.screen}>
      <GlassBackdrop />
      <ScrollView
        style={styles.list}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets>
        <Stack.Screen options={{ title: car ? 'Edit car' : 'Add a car' }} />

        {photoUri ? (
          <View>
            <Image source={{ uri: photoUri }} style={styles.photo} contentFit="cover" />
            <View style={styles.photoActions}>
              <Text style={styles.link} onPress={choosePhoto} accessibilityRole="button">
                Change photo
              </Text>
              <Text style={styles.linkMuted} onPress={() => setPhoto('remove')} accessibilityRole="button">
                Remove
              </Text>
            </View>
          </View>
        ) : (
          <Pressable onPress={choosePhoto} accessibilityRole="button" style={styles.photoPicker}>
            <Ionicons name="camera-outline" size={36} color={Colors.light.tint} />
            <Text style={styles.link}>Add a photo of your car</Text>
          </Pressable>
        )}

        <Text style={styles.label}>Car</Text>
        <CarDetailsInput
          value={{ year: values.year, make: values.make, model: values.model }}
          onChange={(details) => update(details)}
        />
        <TextInput
          value={values.nickname}
          onChangeText={(nickname) => update({ nickname })}
          placeholder="Nickname (optional), e.g. The Grape"
          placeholderTextColor={Colors.light.placeholder}
          maxLength={NICKNAME_MAX}
          accessibilityLabel="Nickname"
          style={styles.input}
        />

        <Text style={styles.label}>Mods</Text>
        <TextInput
          value={values.mods}
          onChangeText={(mods) => update({ mods })}
          placeholder="Intake, exhaust, coilovers, wheels…"
          placeholderTextColor={Colors.light.placeholder}
          maxLength={MODS_MAX}
          multiline
          accessibilityLabel="Mods"
          style={[styles.input, styles.multiline]}
        />

        <Pressable
          onPress={save}
          disabled={busy}
          accessibilityRole="button"
          accessibilityState={{ disabled: busy, busy }}
          style={[styles.button, busy && styles.disabled]}>
          <Text style={styles.buttonText}>{busy ? 'Saving…' : car ? 'Save changes' : 'Add to garage'}</Text>
        </Pressable>
        {car ? (
          <Pressable onPress={remove} disabled={busy} accessibilityRole="button" style={styles.remove}>
            <Ionicons name="trash-outline" size={16} color={Colors.light.danger} />
            <Text style={styles.removeText}>Remove from garage</Text>
          </Pressable>
        ) : null}
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
    backgroundColor: Colors.light.background,
  },
  list: {
    flex: 1,
  },
  loading: {
    marginTop: 48,
  },
  content: {
    padding: 16,
    paddingBottom: 48,
    gap: 10,
    maxWidth: 640,
    width: '100%',
    alignSelf: 'center',
  },
  label: {
    color: Colors.light.text,
    fontWeight: '800',
    marginTop: 8,
  },
  photo: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: 14,
    backgroundColor: Colors.light.imagePlaceholder,
  },
  photoActions: {
    flexDirection: 'row',
    gap: 20,
    marginTop: 8,
  },
  photoPicker: {
    aspectRatio: 16 / 9,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 14,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: Colors.light.avatar,
    backgroundColor: Colors.light.card,
  },
  link: {
    color: Colors.light.tint,
    fontWeight: '700',
  },
  linkMuted: {
    color: Colors.light.muted,
    fontWeight: '600',
  },
  input: {
    ...glass,
    shadowOpacity: 0,
    color: Colors.light.text,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
  },
  multiline: {
    minHeight: 96,
    textAlignVertical: 'top',
  },
  button: {
    backgroundColor: Colors.light.tint,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  disabled: {
    opacity: 0.4,
  },
  buttonText: {
    color: Colors.light.onTint,
    fontWeight: '800',
    fontSize: 16,
  },
  remove: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
  },
  removeText: {
    color: Colors.light.danger,
    fontWeight: '700',
  },
});
