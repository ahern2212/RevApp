import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import Colors from '@/constants/Colors';
import { useGarage } from '@/context/GarageContext';

export default function PostScreen() {
  const { addPost } = useGarage();
  const router = useRouter();
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [car, setCar] = useState('');
  const [caption, setCaption] = useState('');
  const [busy, setBusy] = useState(false);

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
    });
    if (!result.canceled) {
      setImageUri(result.assets[0].uri);
    }
  };

  const share = async () => {
    if (!imageUri) {
      Alert.alert('Add a photo', 'Pick a car photo before sharing.');
      return;
    }
    setBusy(true);
    try {
      await addPost({ imageUri, caption, car });
      setImageUri(null);
      setCar('');
      setCaption('');
      router.replace('/');
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScrollView style={styles.wrap} contentContainerStyle={styles.content}>
      <Pressable onPress={pickImage} style={styles.picker}>
        {imageUri ? (
          <Image source={{ uri: imageUri }} style={styles.preview} contentFit="cover" />
        ) : (
          <Text style={styles.pickerText}>Tap to choose a car photo</Text>
        )}
      </Pressable>
      <TextInput
        value={car}
        onChangeText={setCar}
        placeholder="Car (e.g. 2018 Civic Type R)"
        placeholderTextColor={Colors.dark.muted}
        style={styles.input}
      />
      <TextInput
        value={caption}
        onChangeText={setCaption}
        placeholder="Caption"
        placeholderTextColor={Colors.dark.muted}
        multiline
        style={[styles.input, styles.caption]}
      />
      <Pressable style={[styles.button, busy && { opacity: 0.5 }]} disabled={busy} onPress={share}>
        <Text style={styles.buttonText}>Share</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    backgroundColor: Colors.dark.background,
  },
  content: {
    padding: 16,
    maxWidth: 640,
    width: '100%',
    alignSelf: 'center',
    gap: 12,
  },
  picker: {
    backgroundColor: Colors.dark.card,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    borderRadius: 16,
    overflow: 'hidden',
    minHeight: 280,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickerText: {
    color: Colors.dark.muted,
    fontSize: 16,
  },
  preview: {
    width: '100%',
    aspectRatio: 4 / 5,
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.dark.border,
    backgroundColor: Colors.dark.card,
    color: Colors.dark.text,
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
    backgroundColor: Colors.dark.tint,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 16,
  },
});
