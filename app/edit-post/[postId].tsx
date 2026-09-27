import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import Colors from '@/constants/Colors';
import { useGarage } from '@/context/GarageContext';
import { showError } from '@/lib/confirm';

const CAPTION_MAX = 2200;

export default function EditPostScreen() {
  const { postId } = useLocalSearchParams<{ postId: string }>();
  const router = useRouter();
  const { posts, saved, updateCaption } = useGarage();
  const post = posts.find((p) => p.id === postId) ?? saved.find((p) => p.id === postId);
  const [caption, setCaption] = useState(post?.caption ?? '');
  const [busy, setBusy] = useState(false);

  if (!post) {
    return (
      <View style={styles.wrap}>
        <Text style={styles.missing}>This post isn’t loaded. Go back and try again.</Text>
      </View>
    );
  }

  const unchanged = caption.trim() === post.caption.trim();

  const save = async () => {
    setBusy(true);
    try {
      await updateCaption(post.id, caption);
      router.back();
    } catch (error) {
      showError('Could not save', error);
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScrollView
      style={styles.wrap}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      automaticallyAdjustKeyboardInsets>
      <View style={styles.row}>
        <Image source={{ uri: post.imageUri }} style={styles.thumb} contentFit="cover" />
        <Text style={styles.car}>{post.car || 'Your build'}</Text>
      </View>
      <TextInput
        value={caption}
        onChangeText={setCaption}
        placeholder="Caption"
        placeholderTextColor={Colors.light.placeholder}
        maxLength={CAPTION_MAX}
        multiline
        autoFocus
        accessibilityLabel="Caption"
        style={styles.input}
      />
      <Pressable
        onPress={save}
        disabled={busy || unchanged}
        accessibilityRole="button"
        accessibilityState={{ disabled: busy || unchanged, busy }}
        style={[styles.button, (busy || unchanged) && styles.buttonDisabled]}>
        <Text style={styles.buttonText}>{busy ? 'Saving…' : 'Save'}</Text>
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
    gap: 12,
    maxWidth: 640,
    width: '100%',
    alignSelf: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  thumb: {
    width: 56,
    height: 70,
    borderRadius: 8,
    backgroundColor: Colors.light.imagePlaceholder,
  },
  car: {
    flex: 1,
    color: Colors.light.text,
    fontWeight: '800',
    fontSize: 16,
  },
  input: {
    minHeight: 140,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: Colors.light.border,
    backgroundColor: Colors.light.card,
    color: Colors.light.text,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
  },
  button: {
    backgroundColor: Colors.light.tint,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.4,
  },
  buttonText: {
    color: Colors.light.onTint,
    fontWeight: '800',
    fontSize: 16,
  },
  missing: {
    color: Colors.light.muted,
    textAlign: 'center',
    marginTop: 48,
    paddingHorizontal: 24,
  },
});
