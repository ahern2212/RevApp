import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
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
import { CarRender } from '@/components/CarRender';
import { Chip } from '@/components/Chip';
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
import {
  BODY_STYLE_LABELS,
  BODY_STYLES,
  guessBodyStyle,
  PAINT_COLORS,
  STANCES,
  WHEEL_COLORS,
} from '@/lib/carShapes';
import { confirm, showError } from '@/lib/confirm';

const BLANK: CarInput = {
  nickname: '',
  year: '',
  make: '',
  model: '',
  bodyStyle: 'coupe',
  paint: PAINT_COLORS[0].hex,
  wheels: WHEEL_COLORS[0].hex,
  stance: 'stock',
  mods: '',
};

type Photo = { uri: string; mimeType?: string };

function Chips<T extends string>({
  options,
  value,
  label,
  onChange,
}: {
  options: readonly T[];
  value: T;
  label: (option: T) => string;
  onChange: (option: T) => void;
}) {
  return (
    <View style={styles.chips}>
      {options.map((option) => (
        <Chip key={option} label={label(option)} active={option === value} onPress={() => onChange(option)} />
      ))}
    </View>
  );
}

function Swatches({
  colors,
  value,
  onChange,
}: {
  colors: { name: string; hex: string }[];
  value: string;
  onChange: (hex: string) => void;
}) {
  return (
    <View style={styles.swatches}>
      {colors.map((color) => {
        const active = color.hex.toLowerCase() === value.toLowerCase();
        return (
          <Pressable
            key={color.hex}
            onPress={() => onChange(color.hex)}
            accessibilityRole="button"
            accessibilityLabel={color.name}
            accessibilityState={{ selected: active }}
            style={[styles.swatchRing, active && styles.swatchRingActive]}>
            <View style={[styles.swatch, { backgroundColor: color.hex }]} />
          </Pressable>
        );
      })}
    </View>
  );
}

export default function EditCarScreen() {
  const { carId } = useLocalSearchParams<{ carId?: string }>();
  const router = useRouter();
  const { user } = useGarage();
  const [existing, setExisting] = useState<{ id: string; car: Car | null } | null>(null);
  const [form, setForm] = useState<CarInput | null>(null);
  const [photo, setPhoto] = useState<Photo | 'remove' | undefined>();
  const [busy, setBusy] = useState(false);
  // New cars get a shape matched from the make/model until the user picks one themselves.
  const [styleTouched, setStyleTouched] = useState(!!carId);

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

  const pickPhoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
    });
    if (!result.canceled) setPhoto({ uri: result.assets[0].uri, mimeType: result.assets[0].mimeType });
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

      <View style={styles.stage}>
        <CarRender
          bodyStyle={values.bodyStyle}
          paint={values.paint}
          wheels={values.wheels}
          stance={values.stance}
        />
      </View>

      <Text style={styles.label}>Photo (optional)</Text>
      {photoUri ? (
        <View>
          <Image source={{ uri: photoUri }} style={styles.photo} contentFit="cover" />
          <View style={styles.photoActions}>
            <Text style={styles.link} onPress={pickPhoto} accessibilityRole="button">
              Change photo
            </Text>
            <Text style={styles.linkMuted} onPress={() => setPhoto('remove')} accessibilityRole="button">
              Remove
            </Text>
          </View>
        </View>
      ) : (
        <Pressable onPress={pickPhoto} accessibilityRole="button" style={styles.photoPicker}>
          <Ionicons name="camera-outline" size={22} color={Colors.light.tint} />
          <Text style={styles.link}>Add a photo of your car</Text>
        </Pressable>
      )}

      <Text style={styles.label}>Car</Text>
      <CarDetailsInput
        value={{ year: values.year, make: values.make, model: values.model }}
        onChange={(details) => {
          const guess = styleTouched ? null : guessBodyStyle(details.make, details.model);
          update(guess ? { ...details, bodyStyle: guess } : details);
        }}
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

      <Text style={styles.label}>Body style</Text>
      <Chips
        options={BODY_STYLES}
        value={values.bodyStyle}
        label={(style) => BODY_STYLE_LABELS[style]}
        onChange={(bodyStyle) => {
          setStyleTouched(true);
          update({ bodyStyle });
        }}
      />
      {!styleTouched && guessBodyStyle(values.make, values.model) ? (
        <Text style={styles.autoHint}>
          Matched to {BODY_STYLE_LABELS[values.bodyStyle]} from {values.make} {values.model} — tap a style to
          change it.
        </Text>
      ) : null}

      <Text style={styles.label}>Paint</Text>
      <Swatches colors={PAINT_COLORS} value={values.paint} onChange={(paint) => update({ paint })} />

      <Text style={styles.label}>Wheels</Text>
      <Swatches colors={WHEEL_COLORS} value={values.wheels} onChange={(wheels) => update({ wheels })} />

      <Text style={styles.label}>Stance</Text>
      <Chips
        options={STANCES}
        value={values.stance}
        label={(stance) => stance[0].toUpperCase() + stance.slice(1)}
        onChange={(stance) => update({ stance })}
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
  stage: {
    borderRadius: 16,
    backgroundColor: '#f4f1fb',
    borderWidth: 1,
    borderColor: Colors.light.border,
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  autoHint: {
    color: Colors.light.muted,
    fontSize: 12,
    marginTop: -2,
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 18,
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
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  swatches: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  swatchRing: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  swatchRingActive: {
    borderColor: Colors.light.tint,
  },
  swatch: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.15)',
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
