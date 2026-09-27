import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import Colors from '@/constants/Colors';
import { showError } from '@/lib/confirm';
import {
  CATEGORY_ICONS,
  createThread,
  FORUM_CATEGORIES,
  type ForumCategory,
  THREAD_BODY_MAX,
  THREAD_TITLE_MAX,
} from '@/lib/forums';

export default function NewThreadScreen() {
  const router = useRouter();
  const [category, setCategory] = useState<ForumCategory>('General');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);
  const canPost = title.trim().length >= 3 && !busy;

  const post = async () => {
    if (!canPost) return;
    setBusy(true);
    try {
      const thread = await createThread({ category, title, body });
      router.replace({ pathname: '/forums/[threadId]', params: { threadId: thread.id } });
    } catch (error) {
      showError('Could not post thread', error);
      setBusy(false);
    }
  };

  return (
    <ScrollView
      style={styles.wrap}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      automaticallyAdjustKeyboardInsets>
      <Text style={styles.label}>Category</Text>
      <View style={styles.chips}>
        {FORUM_CATEGORIES.map((c) => {
          const active = c === category;
          return (
            <Pressable
              key={c}
              onPress={() => setCategory(c)}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              style={[styles.chip, active && styles.chipActive]}>
              <Ionicons
                name={CATEGORY_ICONS[c]}
                size={14}
                color={active ? Colors.light.onTint : Colors.light.tint}
              />
              <Text style={[styles.chipText, active && styles.chipTextActive]}>{c}</Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={styles.label}>Title</Text>
      <TextInput
        value={title}
        onChangeText={setTitle}
        placeholder="e.g. Best coilovers for a daily-driven Civic?"
        placeholderTextColor={Colors.light.placeholder}
        maxLength={THREAD_TITLE_MAX}
        accessibilityLabel="Thread title"
        style={styles.input}
      />

      <Text style={styles.label}>Details</Text>
      <TextInput
        value={body}
        onChangeText={setBody}
        placeholder="Give people the context: your car, what you've tried, photos you've posted…"
        placeholderTextColor={Colors.light.placeholder}
        maxLength={THREAD_BODY_MAX}
        multiline
        accessibilityLabel="Thread details"
        style={[styles.input, styles.body]}
      />

      <Pressable
        onPress={post}
        disabled={!canPost}
        accessibilityRole="button"
        accessibilityState={{ disabled: !canPost, busy }}
        style={[styles.button, !canPost && styles.disabled]}>
        <Text style={styles.buttonText}>{busy ? 'Posting…' : 'Post thread'}</Text>
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
    paddingBottom: 48,
    gap: 10,
    maxWidth: 640,
    width: '100%',
    alignSelf: 'center',
  },
  label: {
    color: Colors.light.text,
    fontWeight: '800',
    marginTop: 6,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderWidth: 1,
    borderColor: Colors.light.tint,
    backgroundColor: Colors.light.card,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  chipActive: {
    backgroundColor: Colors.light.tint,
  },
  chipText: {
    color: Colors.light.tint,
    fontWeight: '700',
  },
  chipTextActive: {
    color: Colors.light.onTint,
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.light.border,
    backgroundColor: Colors.light.card,
    color: Colors.light.text,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
  },
  body: {
    minHeight: 160,
    textAlignVertical: 'top',
  },
  button: {
    backgroundColor: Colors.light.tint,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 6,
  },
  disabled: {
    opacity: 0.4,
  },
  buttonText: {
    color: Colors.light.onTint,
    fontWeight: '800',
    fontSize: 16,
  },
});
