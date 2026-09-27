import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput } from 'react-native';

import { CarDetailsInput } from '@/components/CarDetailsInput';
import Colors from '@/constants/Colors';
import { useGarage } from '@/context/GarageContext';
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
      Alert.alert('Add a photo', 'Pick a car photo before sharing.');
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
      Alert.alert('Could not share', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScrollView
      style={styles.wrap}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled">
      <Pressable onPress={pickImage} style={styles.picker}>
        {imageUri ? (
          <Image source={{ uri: imageUri }} style={styles.preview} contentFit="cover" />
        ) : (
          <Text style={styles.pickerText}>Tap to choose a car photo</Text>
        )}
      </Pressable>
      <CarDetailsInput value={car} onChange={setCar} />
      <TextInput
        value={caption}
        onChangeText={setCaption}
        placeholder="Caption"
        maxLength={2200}
        placeholderTextColor={Colors.light.placeholder}
        multiline
        style={[styles.input, styles.caption]}
      />
      <Pressable style={[styles.button, busy && { opacity: 0.5 }]} disabled={busy} onPress={share}>
        <Text style={styles.buttonText}>{busy ? 'Sharing…' : 'Share'}</Text>
      </Pressable>
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
  pickerText: {
    color: Colors.light.muted,
    fontSize: 16,
  },
  preview: {
    width: '100%',
    aspectRatio: 4 / 5,
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.light.border,
    backgroundColor: Colors.light.card,
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
