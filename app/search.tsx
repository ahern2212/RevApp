import Ionicons from '@expo/vector-icons/Ionicons';
import { useLocalSearchParams, useRouter } from 'expo-router';
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

import { Avatar } from '@/components/Avatar';
import { Chip } from '@/components/Chip';
import { PostGrid } from '@/components/PostGrid';
import { GlassBackdrop } from '@/components/GlassBackdrop';
import Colors from '@/constants/Colors';
import { glass } from '@/constants/glass';
import type { TagCount } from '@/lib/richText';
import { fetchTrendingTags, search, type SearchResults } from '@/lib/search';

const DEBOUNCE_MS = 300;

export default function SearchScreen() {
  const router = useRouter();
  // Opened from a tapped #hashtag: start with that search.
  const { q: initialQuery } = useLocalSearchParams<{ q?: string }>();
  const [query, setQuery] = useState(initialQuery ?? '');
  const [results, setResults] = useState<(SearchResults & { query: string }) | null>(null);
  const q = query.trim();
  const current = results && results.query === q ? results : null;
  const [trending, setTrending] = useState<TagCount[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchTrendingTags()
      .then((tags) => !cancelled && setTrending(tags))
      .catch((error) => console.warn('Failed to load trending tags', error));
    return () => {
      cancelled = true;
    };
  }, []);
  const searching = q.length >= 2 && !current;

  // Search after the user pauses typing.
  useEffect(() => {
    if (q.length < 2) return;
    let cancelled = false;
    const timer = setTimeout(() => {
      search(q)
        .then((next) => !cancelled && setResults({ ...next, query: q }))
        .catch((error) => {
          console.warn('Search failed', error);
          if (!cancelled) setResults({ drivers: [], posts: [], query: q });
        });
    }, DEBOUNCE_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [q]);

  return (
    <View style={styles.screen}>
      <GlassBackdrop />
      <ScrollView
      style={styles.list}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled">
      <View style={styles.searchBar}>
        <Ionicons name="search" size={18} color={Colors.light.muted} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search drivers or cars (e.g. civic, supra)"
          placeholderTextColor={Colors.light.placeholder}
          autoFocus
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
          accessibilityLabel="Search"
          style={styles.input}
        />
        {query ? (
          <Pressable
            onPress={() => setQuery('')}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Clear search">
            <Ionicons name="close-circle" size={18} color={Colors.light.muted} />
          </Pressable>
        ) : null}
      </View>

      {q.length < 2 ? (
        <>
          <Text style={styles.hint}>Type at least 2 letters to search usernames, cars and captions.</Text>
          {trending && trending.length > 0 ? (
            <View style={styles.section}>
              <Text style={styles.heading}>Trending this week</Text>
              <View style={styles.tags}>
                {trending.map(({ tag, count }) => (
                  <Chip
                    key={tag}
                    label={`#${tag} · ${count}`}
                    onPress={() => setQuery(`#${tag}`)}
                  />
                ))}
              </View>
            </View>
          ) : null}
        </>
      ) : searching ? (
        <ActivityIndicator color={Colors.light.tint} style={styles.loading} />
      ) : current && current.drivers.length === 0 && current.posts.length === 0 ? (
        <Text style={styles.hint}>No drivers or builds match “{q}”.</Text>
      ) : current ? (
        <>
          {current.drivers.length > 0 ? (
            <View style={styles.section}>
              <Text style={styles.heading}>Drivers</Text>
              {current.drivers.map((driver) => (
                <Pressable
                  key={driver.id}
                  onPress={() =>
                    router.push({
                      pathname: '/user/[userId]',
                      params: { userId: driver.id, name: driver.username },
                    })
                  }
                  accessibilityRole="link"
                  style={({ pressed }) => [styles.driver, pressed && styles.pressed]}>
                  <Avatar name={driver.username} userId={driver.id} size={40} />
                  <Text style={styles.username}>{driver.username}</Text>
                  <Ionicons name="chevron-forward" size={18} color={Colors.light.muted} />
                </Pressable>
              ))}
            </View>
          ) : null}
          {current.posts.length > 0 ? (
            <View style={styles.section}>
              <Text style={styles.heading}>Builds</Text>
              <PostGrid posts={current.posts} emptyText="" />
            </View>
          ) : null}
        </>
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
  content: {
    padding: 16,
    gap: 16,
    maxWidth: 640,
    width: '100%',
    alignSelf: 'center',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    ...glass,
    borderRadius: 12,
    paddingHorizontal: 12,
  },
  input: {
    flex: 1,
    color: Colors.light.text,
    fontSize: 16,
    paddingVertical: 12,
  },
  hint: {
    color: Colors.light.muted,
    textAlign: 'center',
    marginTop: 24,
    lineHeight: 20,
  },
  loading: {
    marginTop: 24,
  },
  section: {
    gap: 8,
  },
  heading: {
    color: Colors.light.text,
    fontSize: 16,
    fontWeight: '800',
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  driver: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: 10,
  },
  pressed: {
    backgroundColor: Colors.light.card,
  },
  username: {
    flex: 1,
    color: Colors.light.text,
    fontWeight: '700',
  },
});
