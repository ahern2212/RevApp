import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { Chip } from '@/components/Chip';
import { GlassBackdrop } from '@/components/GlassBackdrop';
import Colors from '@/constants/Colors';
import { glass } from '@/constants/glass';
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
    <View style={styles.screen}>
      <GlassBackdrop />
      <ScrollView
      style={styles.list}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      automaticallyAdjustKeyboardInsets>
      <Text style={styles.label}>Category</Text>
      <View style={styles.chips}>
        {FORUM_CATEGORIES.map((c) => (
          <Chip
            key={c}
            label={c}
            icon={CATEGORY_ICONS[c]}
            active={c === category}
            onPress={() => setCategory(c)}
          />
        ))}
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
  input: {
    ...glass,
    shadowOpacity: 0,
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
