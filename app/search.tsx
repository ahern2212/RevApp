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
import Animated, { FadeInRight } from 'react-native-reanimated';

import { Avatar } from '@/components/Avatar';
import { Chip } from '@/components/Chip';
import { PressableScale } from '@/components/PressableScale';
import { PostGrid } from '@/components/PostGrid';
import { GlassBackdrop } from '@/components/GlassBackdrop';
import Colors from '@/constants/Colors';
import { glass } from '@/constants/glass';
import { showError } from '@/lib/confirm';
import { follow } from '@/lib/follows';
import type { TagCount } from '@/lib/richText';
import {
  fetchExplorePosts,
  fetchSuggestedDrivers,
  fetchTrendingTags,
  search,
  type SearchResults,
  type SuggestedDriver,
} from '@/lib/search';
import type { Post } from '@/types';

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
  const [suggested, setSuggested] = useState<SuggestedDriver[]>([]);
  const [followed, setFollowed] = useState<Set<string>>(() => new Set());
  const [explore, setExplore] = useState<Post[] | null>(null);

  // Explore content for the empty search screen.
  useEffect(() => {
    let cancelled = false;
    fetchTrendingTags()
      .then((tags) => !cancelled && setTrending(tags))
      .catch((error) => console.warn('Failed to load trending tags', error));
    fetchSuggestedDrivers()
      .then((drivers) => !cancelled && setSuggested(drivers))
      .catch((error) => console.warn('Failed to load suggestions', error));
    fetchExplorePosts()
      .then((posts) => !cancelled && setExplore(posts))
      .catch((error) => console.warn('Failed to load explore', error));
    return () => {
      cancelled = true;
    };
  }, []);

  const followDriver = async (driver: SuggestedDriver) => {
    setFollowed((current) => new Set(current).add(driver.id));
    try {
      await follow(driver.id);
    } catch (error) {
      setFollowed((current) => {
        const next = new Set(current);
        next.delete(driver.id);
        return next;
      });
      showError('Could not follow', error);
    }
  };
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
          {suggested.length > 0 ? (
            <View style={styles.section}>
              <Text style={styles.heading}>Drivers to follow</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.suggestions}>
                {suggested.map((driver, index) => {
                  const isFollowing = followed.has(driver.id);
                  return (
                    <Animated.View
                      key={driver.id}
                      entering={FadeInRight.delay(Math.min(index, 6) * 60).springify().damping(16)}
                      style={styles.suggestion}>
                    <PressableScale
                      scaleTo={0.96}
                      onPress={() =>
                        router.push({
                          pathname: '/user/[userId]',
                          params: { userId: driver.id, name: driver.username },
                        })
                      }
                      accessibilityRole="link"
                      style={styles.suggestionLink}>
                      <Avatar name={driver.username} userId={driver.id} size={56} />
                      <Text style={styles.suggestionName} numberOfLines={1}>
                        {driver.username}
                      </Text>
                      <Text style={styles.suggestionMeta} numberOfLines={1}>
                        {driver.mutuals > 0
                          ? `${driver.mutuals} you follow ${driver.mutuals === 1 ? 'follows' : 'follow'}`
                          : `${driver.followers} ${driver.followers === 1 ? 'follower' : 'followers'}`}
                      </Text>
                    </PressableScale>
                      <Pressable
                        onPress={() => followDriver(driver)}
                        disabled={isFollowing}
                        accessibilityRole="button"
                        accessibilityLabel={isFollowing ? `Following ${driver.username}` : `Follow ${driver.username}`}
                        style={[styles.followButton, isFollowing && styles.followingButton]}>
                        <Text style={[styles.followText, isFollowing && styles.followingText]}>
                          {isFollowing ? 'Following' : 'Follow'}
                        </Text>
                      </Pressable>
                    </Animated.View>
                  );
                })}
              </ScrollView>
            </View>
          ) : null}
          {explore && explore.length > 0 ? (
            <View style={styles.section}>
              <Text style={styles.heading}>Explore</Text>
              <PostGrid posts={explore} emptyText="" />
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
  suggestions: {
    gap: 10,
    paddingVertical: 2,
  },
  suggestion: {
    ...glass,
    width: 140,
    alignItems: 'center',
    gap: 4,
    borderRadius: 16,
    padding: 12,
  },
  suggestionLink: {
    alignItems: 'center',
    gap: 4,
  },
  suggestionName: {
    color: Colors.light.text,
    fontWeight: '800',
    marginTop: 4,
  },
  suggestionMeta: {
    color: Colors.light.muted,
    fontSize: 12,
  },
  followButton: {
    marginTop: 6,
    alignSelf: 'stretch',
    alignItems: 'center',
    backgroundColor: Colors.light.tint,
    borderRadius: 10,
    paddingVertical: 6,
  },
  followingButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  followText: {
    color: Colors.light.onTint,
    fontWeight: '800',
  },
  followingText: {
    color: Colors.light.muted,
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
