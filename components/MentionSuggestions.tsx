import { useEffect, useState } from 'react';
import {
  type NativeSyntheticEvent,
  Pressable,
  StyleSheet,
  Text,
  type TextInputSelectionChangeEventData,
  View,
} from 'react-native';

import { Avatar } from '@/components/Avatar';
import Colors from '@/constants/Colors';
import { glass } from '@/constants/glass';
import { type Driver, searchUsernames } from '@/lib/profiles';
import { activeMention, insertMention } from '@/lib/richText';

const DEBOUNCE_MS = 200;

/**
 * @mention autocomplete for a text input. Pass the input's text and setter; wire
 * `onSelectionChange` to the TextInput and render <MentionSuggestions> near it.
 */
export function useMentions(text: string, setText: (next: string) => void) {
  const [cursor, setCursor] = useState<number | null>(null);
  const [results, setResults] = useState<{ query: string; list: Driver[] } | null>(null);
  const mention = cursor === null ? null : activeMention(text, cursor);
  const query = mention && mention.query.length > 0 ? mention.query : null;

  useEffect(() => {
    if (!query) return;
    let cancelled = false;
    const timer = setTimeout(() => {
      searchUsernames(query)
        .then((list) => !cancelled && setResults({ query, list }))
        .catch((error) => console.warn('Mention search failed', error));
    }, DEBOUNCE_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query]);

  const suggestions = query && results?.query === query ? results.list : [];

  const pick = (username: string) => {
    if (!mention || cursor === null) return;
    const next = insertMention(text, mention, cursor, username);
    setText(next.text);
    setCursor(next.cursor);
  };

  const onSelectionChange = (event: NativeSyntheticEvent<TextInputSelectionChangeEventData>) =>
    setCursor(event.nativeEvent.selection.end);

  return { suggestions, pick, onSelectionChange };
}

export function MentionSuggestions({
  suggestions,
  onPick,
}: {
  suggestions: Driver[];
  onPick: (username: string) => void;
}) {
  if (suggestions.length === 0) return null;
  return (
    <View style={styles.card} accessibilityRole="menu">
      {suggestions.map((driver) => (
        <Pressable
          key={driver.id}
          onPress={() => onPick(driver.username)}
          accessibilityRole="menuitem"
          accessibilityLabel={`Mention ${driver.username}`}
          style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
          <Avatar name={driver.username} userId={driver.id} size={28} />
          <Text style={styles.name}>@{driver.username}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    ...glass,
    borderRadius: 14,
    paddingVertical: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  pressed: {
    backgroundColor: Colors.light.card,
  },
  name: {
    color: Colors.light.text,
    fontWeight: '700',
  },
});
