import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Avatar } from '@/components/Avatar';
import { Chip } from '@/components/Chip';
import Colors from '@/constants/Colors';
import { GlassBackdrop } from '@/components/GlassBackdrop';
import { glass } from '@/constants/glass';
import { useGarage } from '@/context/GarageContext';
import {
  CATEGORY_ICONS,
  fetchThreads,
  FORUM_CATEGORIES,
  type ForumCategory,
  type ForumThread,
  SORT_LABELS,
  THREAD_SORTS,
  type ThreadFilters,
  type ThreadSort,
} from '@/lib/forums';
import { useTabBarSpace } from '@/lib/layout';
import { timeAgo } from '@/lib/time';

const SEARCH_DEBOUNCE_MS = 300;

export default function ForumsScreen() {
  const router = useRouter();
  const { user } = useGarage();
  const tabBarSpace = useTabBarSpace();
  const { top } = useSafeAreaInsets();
  const [category, setCategory] = useState<ForumCategory | null>(null);
  const [sort, setSort] = useState<ThreadSort>('active');
  const [mine, setMine] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [search, setSearch] = useState(''); // debounced copy of searchText
  const [threads, setThreads] = useState<{ key: string; list: ForumThread[] } | null>(null);
  const [error, setError] = useState<{ key: string; message: string } | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const filters: ThreadFilters = {
    category,
    sort,
    search,
    authorId: mine ? (user?.id ?? null) : null,
  };
  const key = JSON.stringify(filters);
  const list = threads?.key === key ? threads.list : null;
  const failed = error?.key === key ? error.message : null;
  const filtered = !!category || mine || search.trim().length >= 2 || sort === 'unanswered';

  // Search once the user pauses typing.
  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchText), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [searchText]);

  const load = useCallback(async () => {
    const current: ThreadFilters = JSON.parse(key);
    try {
      setThreads({ key, list: await fetchThreads(current) });
      setError(null);
    } catch (err) {
      console.warn('Failed to load threads', err);
      setError({ key, message: err instanceof Error ? err.message : 'Couldn’t load the forums.' });
      setThreads({ key, list: [] });
    }
  }, [key]);

  // Reload on every visit and whenever a filter changes.
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const clearFilters = () => {
    setCategory(null);
    setMine(false);
    setSearchText('');
    setSearch('');
    if (sort === 'unanswered') setSort('active');
  };

  const header = (
    <View style={styles.header}>
      <View style={styles.titleRow}>
        <View style={styles.titleText}>
          <Text style={styles.title}>Forums</Text>
          <Text style={styles.subtitle}>Ask questions, share builds, talk cars.</Text>
        </View>
        <Pressable
          onPress={() => router.push('/forums/new')}
          accessibilityRole="button"
          style={({ pressed }) => [styles.newButton, pressed && styles.pressed]}>
          <Ionicons name="create-outline" size={18} color={Colors.light.onTint} />
          <Text style={styles.newText}>New thread</Text>
        </Pressable>
      </View>

      <View style={styles.searchBar}>
        <Ionicons name="search" size={18} color={Colors.light.muted} />
        <TextInput
          value={searchText}
          onChangeText={setSearchText}
          placeholder="Search threads (e.g. coilovers, misfire)"
          placeholderTextColor={Colors.light.placeholder}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
          accessibilityLabel="Search threads"
          style={styles.searchInput}
        />
        {searchText ? (
          <Pressable
            onPress={() => setSearchText('')}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Clear search">
            <Ionicons name="close-circle" size={18} color={Colors.light.muted} />
          </Pressable>
        ) : null}
      </View>

      <View style={styles.sorts} accessibilityRole="tablist">
        {THREAD_SORTS.map((option) => {
          const active = option === sort;
          return (
            <Pressable
              key={option}
              onPress={() => setSort(option)}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              style={[styles.sort, active && styles.sortActive]}>
              <Text style={[styles.sortText, active && styles.sortTextActive]}>
                {SORT_LABELS[option]}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
        <Chip label="Mine" icon="person-outline" active={mine} onPress={() => setMine((value) => !value)} />
        <View style={styles.chipDivider} />
        {[null, ...FORUM_CATEGORIES].map((c) => (
          <Chip
            key={c ?? 'all'}
            label={c ?? 'All'}
            icon={c ? CATEGORY_ICONS[c] : undefined}
            active={c === category}
            onPress={() => setCategory(c)}
          />
        ))}
      </ScrollView>

      {list && filtered ? (
        <View style={styles.summary}>
          <Text style={styles.summaryText} numberOfLines={1}>
            {list.length} {list.length === 1 ? 'thread' : 'threads'}
            {category ? ` in ${category}` : ''}
            {mine ? ' by you' : ''}
            {search.trim().length >= 2 ? ` matching “${search.trim()}”` : ''}
          </Text>
          <Text style={styles.clear} onPress={clearFilters} accessibilityRole="button">
            Clear
          </Text>
        </View>
      ) : null}
    </View>
  );

  return (
    <View style={styles.screen}>
      <GlassBackdrop />
      <FlatList
      style={styles.wrap}
      contentContainerStyle={[styles.content, { paddingTop: top + 16, paddingBottom: tabBarSpace }]}
      data={list ?? []}
      keyExtractor={(item) => item.id}
      ListHeaderComponent={header}
      keyboardShouldPersistTaps="handled"
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.light.tint} />
      }
      ListEmptyComponent={
        list === null ? (
          <ActivityIndicator color={Colors.light.tint} style={styles.loading} />
        ) : (
          <View style={styles.empty}>
            <Ionicons
              name={failed ? 'cloud-offline-outline' : filtered ? 'search-outline' : 'chatbubbles-outline'}
              size={38}
              color={Colors.light.tint}
            />
            <Text style={styles.emptyTitle}>
              {failed ? 'Couldn’t load the forums' : filtered ? 'No matching threads' : 'No threads yet'}
            </Text>
            <Text style={styles.emptyText}>
              {failed
                ? failed
                : filtered
                  ? 'Try another search or category, or clear the filters.'
                  : 'Start the first conversation with “New thread”.'}
            </Text>
          </View>
        )
      }
      renderItem={({ item }) => (
        <Pressable
          onPress={() => router.push({ pathname: '/forums/[threadId]', params: { threadId: item.id } })}
          accessibilityRole="button"
          style={({ pressed }) => [styles.thread, pressed && styles.pressed]}>
          <View style={styles.threadTop}>
            <View style={styles.categoryPill}>
              <Ionicons name={CATEGORY_ICONS[item.category]} size={12} color={Colors.light.tint} />
              <Text style={styles.categoryText}>{item.category}</Text>
            </View>
            <Text style={styles.time}>{timeAgo(item.lastActivityAt)}</Text>
          </View>
          <Text style={styles.threadTitle} numberOfLines={2}>
            {item.title}
          </Text>
          {item.body ? (
            <Text style={styles.threadBody} numberOfLines={2}>
              {item.body}
            </Text>
          ) : null}
          <View style={styles.threadMeta}>
            <Avatar name={item.authorName} userId={item.authorId} size={22} />
            <Text style={styles.author}>{item.authorName}</Text>
            <View style={styles.replies}>
              <Ionicons name="chatbubble-outline" size={14} color={Colors.light.muted} />
              <Text style={styles.repliesText}>{item.replyCount}</Text>
            </View>
          </View>
        </Pressable>
      )}
    />
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
  },
  content: {
    padding: 16,
    gap: 10,
    maxWidth: 640,
    width: '100%',
    alignSelf: 'center',
  },
  header: {
    gap: 12,
    marginBottom: 4,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  titleText: {
    flex: 1,
  },
  title: {
    color: Colors.light.text,
    fontSize: 24,
    fontWeight: '900',
  },
  subtitle: {
    color: Colors.light.muted,
    marginTop: 2,
  },
  newButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.light.tint,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  newText: {
    color: Colors.light.onTint,
    fontWeight: '800',
  },
  pressed: {
    opacity: 0.8,
  },
  chips: {
    gap: 8,
    alignItems: 'center',
  },
  chipDivider: {
    width: StyleSheet.hairlineWidth,
    height: 24,
    backgroundColor: Colors.light.border,
    marginHorizontal: 2,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    ...glass,
    borderRadius: 12,
    paddingHorizontal: 12,
  },
  searchInput: {
    flex: 1,
    color: Colors.light.text,
    fontSize: 15,
    paddingVertical: 10,
  },
  sorts: {
    flexDirection: 'row',
    ...glass,
    borderRadius: 12,
    padding: 3,
  },
  sort: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: 9,
  },
  sortActive: {
    backgroundColor: Colors.light.tint,
  },
  sortText: {
    color: Colors.light.muted,
    fontWeight: '700',
    fontSize: 13,
  },
  sortTextActive: {
    color: Colors.light.onTint,
  },
  summary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  summaryText: {
    flex: 1,
    color: Colors.light.muted,
    fontSize: 13,
  },
  clear: {
    color: Colors.light.tint,
    fontWeight: '800',
    padding: 4,
  },
  loading: {
    marginTop: 32,
  },
  empty: {
    alignItems: 'center',
    gap: 8,
    marginTop: 32,
    paddingHorizontal: 24,
  },
  emptyTitle: {
    color: Colors.light.text,
    fontSize: 18,
    fontWeight: '800',
  },
  emptyText: {
    color: Colors.light.muted,
    textAlign: 'center',
    lineHeight: 20,
  },
  thread: {
    gap: 6,
    padding: 14,
    borderRadius: 14,
    ...glass,
  },
  threadTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  categoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.light.avatar,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  categoryText: {
    color: Colors.light.text,
    fontSize: 12,
    fontWeight: '700',
  },
  time: {
    color: Colors.light.muted,
    fontSize: 12,
  },
  threadTitle: {
    color: Colors.light.text,
    fontSize: 16,
    fontWeight: '800',
  },
  threadBody: {
    color: Colors.light.muted,
    lineHeight: 19,
  },
  threadMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  author: {
    flex: 1,
    color: Colors.light.text,
    fontWeight: '600',
    fontSize: 13,
  },
  replies: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  repliesText: {
    color: Colors.light.muted,
    fontWeight: '700',
  },
});
