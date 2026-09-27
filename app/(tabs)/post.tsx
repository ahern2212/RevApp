import Ionicons from '@expo/vector-icons/Ionicons';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { CarDetailsInput } from '@/components/CarDetailsInput';
import Colors from '@/constants/Colors';
import { glass } from '@/constants/glass';
import { GlassBackdrop } from '@/components/GlassBackdrop';
import { useGarage } from '@/context/GarageContext';
import { showError } from '@/lib/confirm';
import { useTabBarSpace } from '@/lib/layout';
import { type CarDetails, formatCar } from '@/lib/vehicles';

const EMPTY_CAR: CarDetails = { year: '', make: '', model: '' };

export default function PostScreen() {
  const { addPost } = useGarage();
  const router = useRouter();
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [mimeType, setMimeType] = useState<string | undefined>();
  const [car, setCar] = useState<CarDetails>(EMPTY_CAR);
  const [caption, setCaption] = useState('');
  const [busy, setBusy] = useState(false);
  const tabBarSpace = useTabBarSpace();
  const canShare = !!imageUri && !busy;

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
    });
    if (!result.canceled) {
      setImageUri(result.assets[0].uri);
      setMimeType(result.assets[0].mimeType);
    }
  };

  const share = async () => {
    if (!imageUri) {
      showError('Add a photo', new Error('Pick a car photo before sharing.'));
      return;
    }
    setBusy(true);
    try {
      await addPost({ imageUri, mimeType, caption, car: formatCar(car) });
      setImageUri(null);
      setMimeType(undefined);
      setCar(EMPTY_CAR);
      setCaption('');
      router.replace('/');
    } catch (error) {
      showError('Could not share', error);
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.screen}>
      <GlassBackdrop />
      <ScrollView
      style={styles.wrap}
      contentContainerStyle={[styles.content, { paddingBottom: tabBarSpace }]}
      keyboardShouldPersistTaps="handled"
      automaticallyAdjustKeyboardInsets>
      <Pressable
        onPress={pickImage}
        style={styles.picker}
        accessibilityRole="button"
        accessibilityLabel={imageUri ? 'Change photo' : 'Choose a car photo'}>
        {imageUri ? (
          <>
            <Image source={{ uri: imageUri }} style={styles.preview} contentFit="cover" />
            <View style={styles.changeBadge}>
              <Ionicons name="images-outline" size={14} color={Colors.light.onTint} />
              <Text style={styles.changeText}>Change</Text>
            </View>
          </>
        ) : (
          <View style={styles.pickerEmpty}>
            <Ionicons name="camera-outline" size={40} color={Colors.light.tint} />
            <Text style={styles.pickerText}>Tap to choose a car photo</Text>
          </View>
        )}
      </Pressable>
      <CarDetailsInput value={car} onChange={setCar} />
      <TextInput
        value={caption}
        onChangeText={setCaption}
        placeholder="Caption"
        maxLength={CAPTION_MAX}
        placeholderTextColor={Colors.light.placeholder}
        multiline
        style={[styles.input, styles.caption]}
      />
      {caption.length > CAPTION_MAX - 200 ? (
        <Text style={styles.counter}>
          {caption.length}/{CAPTION_MAX}
        </Text>
      ) : null}
      <Pressable
        style={[styles.button, !canShare && styles.buttonDisabled]}
        disabled={!canShare}
        onPress={share}
        accessibilityRole="button"
        accessibilityState={{ disabled: !canShare, busy }}>
        <Text style={styles.buttonText}>{busy ? 'Sharing…' : 'Share'}</Text>
      </Pressable>
      {!imageUri ? <Text style={styles.hint}>Add a photo to share your build.</Text> : null}
    </ScrollView>
    </View>
  );
}

const CAPTION_MAX = 2200;

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
    maxWidth: 640,
    width: '100%',
    alignSelf: 'center',
    gap: 12,
  },
  picker: {
    backgroundColor: Colors.light.card,
    borderWidth: 1,
    borderColor: Colors.light.border,
    borderRadius: 16,
    overflow: 'hidden',
    minHeight: 280,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickerEmpty: {
    alignItems: 'center',
    gap: 8,
  },
  changeBadge: {
    position: 'absolute',
    right: 12,
    bottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(45, 31, 71, 0.7)',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  changeText: {
    color: Colors.light.onTint,
    fontWeight: '700',
    fontSize: 12,
  },
  counter: {
    color: Colors.light.muted,
    fontSize: 12,
    textAlign: 'right',
    marginTop: -6,
  },
  buttonDisabled: {
    opacity: 0.4,
  },
  hint: {
    color: Colors.light.muted,
    textAlign: 'center',
    fontSize: 13,
  },
  pickerText: {
    color: Colors.light.muted,
    fontSize: 16,
  },
  preview: {
    width: '100%',
    aspectRatio: 4 / 5,
  },
  input: {
    ...glass,
    shadowOpacity: 0,
    color: Colors.light.text,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
  },
  caption: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  button: {
    backgroundColor: Colors.light.tint,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonText: {
    color: Colors.light.onTint,
    fontWeight: '800',
    fontSize: 16,
  },
});
