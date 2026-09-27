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
import Svg, { Circle, Path, Rect } from 'react-native-svg';

import { Chip } from '@/components/Chip';
import { GlassBackdrop } from '@/components/GlassBackdrop';
import { ListingCard } from '@/components/ListingCard';
import Colors, { art } from '@/constants/Colors';
import { glass } from '@/constants/glass';
import { useTabBarSpace } from '@/lib/layout';
import {
  CATEGORY_ICONS,
  fetchListings,
  LISTING_CATEGORIES,
  LISTING_SORT_LABELS,
  LISTING_SORTS,
  type Listing,
  type ListingCategory,
  type ListingFilters,
  type ListingSort,
} from '@/lib/listings';

const SEARCH_DEBOUNCE_MS = 300;

/** Little storefront illustration for the hero card. */
function Storefront() {
  return (
    <Svg width={84} height={64} viewBox="0 0 84 64" accessibilityElementsHidden>
      <Rect x={8} y={24} width={68} height={36} rx={4} fill={art.accentSoft} />
      <Path d="M4,24 L12,8 L72,8 L80,24 Z" fill={Colors.light.tint} />
      {[12, 28, 44, 60].map((x) => (
        <Path key={x} d={`M${x},24 Q${x + 4},32 ${x + 8},24 Z`} fill={art.skyTop} opacity={0.9} />
      ))}
      <Rect x={16} y={34} width={22} height={16} rx={2} fill={art.skyTop} opacity={0.9} />
      <Rect x={46} y={34} width={20} height={26} rx={2} fill={Colors.light.tint} opacity={0.85} />
      <Circle cx={61} cy={48} r={1.6} fill={art.accentSoft} />
    </Svg>
  );
}

export default function MarketScreen() {
  const router = useRouter();
  const tabBarSpace = useTabBarSpace();
  const { top } = useSafeAreaInsets();
  const [category, setCategory] = useState<ListingCategory | null>(null);
  const [sort, setSort] = useState<ListingSort>('new');
  const [includeSold, setIncludeSold] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [search, setSearch] = useState('');
  const [listings, setListings] = useState<{ key: string; list: Listing[] } | null>(null);
  const [failed, setFailed] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const filters: ListingFilters = { category, sort, search, includeSold };
  const key = JSON.stringify(filters);
  const list = listings?.key === key ? listings.list : null;
  const filtered = !!category || search.trim().length >= 2;

  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchText), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [searchText]);

  const load = useCallback(async () => {
    try {
      setListings({ key, list: await fetchListings(JSON.parse(key)) });
      setFailed(null);
    } catch (error) {
      console.warn('Failed to load listings', error);
      setFailed(error instanceof Error ? error.message : 'Couldn’t load the market.');
      setListings({ key, list: [] });
    }
  }, [key]);

  // Reload on every visit (new listings, sold items) and when a filter changes.
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

  const header = (
    <View style={styles.header}>
      <View style={styles.hero}>
        <View style={styles.heroText}>
          <Text style={styles.title}>Market</Text>
          <Text style={styles.subtitle}>Cars, parts and wheels from drivers you know.</Text>
          <Pressable
            onPress={() => router.push('/market/new')}
            accessibilityRole="button"
            style={({ pressed }) => [styles.sell, pressed && styles.pressed]}>
            <Ionicons name="pricetag" size={16} color={Colors.light.onTint} />
            <Text style={styles.sellText}>Sell something</Text>
          </Pressable>
        </View>
        <Storefront />
      </View>

      <View style={styles.searchBar}>
        <Ionicons name="search" size={18} color={Colors.light.muted} />
        <TextInput
          value={searchText}
          onChangeText={setSearchText}
          placeholder="Search listings (e.g. coilovers, Miata)"
          placeholderTextColor={Colors.light.placeholder}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
          accessibilityLabel="Search listings"
          style={styles.searchInput}
        />
        {searchText ? (
          <Pressable onPress={() => setSearchText('')} hitSlop={8} accessibilityRole="button" accessibilityLabel="Clear search">
            <Ionicons name="close-circle" size={18} color={Colors.light.muted} />
          </Pressable>
        ) : null}
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
        {[null, ...LISTING_CATEGORIES].map((c) => (
          <Chip
            key={c ?? 'all'}
            label={c ?? 'All'}
            icon={c ? CATEGORY_ICONS[c] : 'grid-outline'}
            active={c === category}
            onPress={() => setCategory(c)}
          />
        ))}
      </ScrollView>

      <View style={styles.sortRow}>
        <View style={styles.sorts}>
          {LISTING_SORTS.map((option) => {
            const active = option === sort;
            return (
              <Pressable
                key={option}
                onPress={() => setSort(option)}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                style={[styles.sort, active && styles.sortActive]}>
                <Text style={[styles.sortText, active && styles.sortTextActive]}>
                  {LISTING_SORT_LABELS[option]}
                </Text>
              </Pressable>
            );
          })}
        </View>
        <Chip
          label="Show sold"
          icon={includeSold ? 'checkmark' : undefined}
          active={includeSold}
          onPress={() => setIncludeSold((value) => !value)}
        />
      </View>
    </View>
  );

  return (
    <View style={styles.screen}>
      <GlassBackdrop />
      <FlatList
        style={styles.list}
        contentContainerStyle={[styles.content, { paddingTop: top + 16, paddingBottom: tabBarSpace }]}
        data={list ?? []}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={styles.row}
        ListHeaderComponent={header}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.light.tint} />
        }
        renderItem={({ item }) => (
          // maxWidth keeps a lone last card at half width.
          <View style={styles.cell}>
            <ListingCard
              listing={item}
              onPress={() => router.push({ pathname: '/market/[listingId]', params: { listingId: item.id } })}
            />
          </View>
        )}
        ListEmptyComponent={
          list === null ? (
            <ActivityIndicator color={Colors.light.tint} style={styles.loading} />
          ) : (
            <View style={styles.empty}>
              <Ionicons
                name={failed ? 'cloud-offline-outline' : filtered ? 'search-outline' : 'storefront-outline'}
                size={40}
                color={Colors.light.tint}
              />
              <Text style={styles.emptyTitle}>
                {failed ? 'Couldn’t load the market' : filtered ? 'Nothing matches' : 'The market is open'}
              </Text>
              <Text style={styles.emptyText}>
                {failed
                  ? 'Pull down to try again. If this keeps happening, the marketplace database update may not be installed yet.'
                  : filtered
                    ? 'Try another search or category.'
                    : 'Be the first to list a car, part or set of wheels — tap “Sell something”.'}
              </Text>
            </View>
          )
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  list: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 12,
    gap: 12,
    maxWidth: 720,
    width: '100%',
    alignSelf: 'center',
  },
  row: {
    gap: 12,
  },
  cell: {
    flex: 1,
    maxWidth: '50%',
  },
  header: {
    gap: 12,
    marginBottom: 4,
  },
  hero: {
    ...glass,
    borderRadius: 22,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  heroText: {
    flex: 1,
    gap: 4,
  },
  title: {
    color: Colors.light.text,
    fontSize: 26,
    fontWeight: '900',
  },
  subtitle: {
    color: Colors.light.muted,
    lineHeight: 19,
  },
  sell: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    marginTop: 8,
    backgroundColor: Colors.light.tint,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  sellText: {
    color: Colors.light.onTint,
    fontWeight: '800',
  },
  pressed: {
    opacity: 0.8,
  },
  searchBar: {
    ...glass,
    shadowOpacity: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 12,
    paddingHorizontal: 12,
  },
  searchInput: {
    flex: 1,
    color: Colors.light.text,
    fontSize: 15,
    paddingVertical: 10,
  },
  chips: {
    gap: 8,
  },
  sortRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sorts: {
    ...glass,
    shadowOpacity: 0,
    flex: 1,
    flexDirection: 'row',
    borderRadius: 12,
    padding: 3,
  },
  sort: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 7,
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
});
