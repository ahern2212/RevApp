import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Avatar } from '@/components/Avatar';
import Colors from '@/constants/Colors';
import {
  CATEGORY_ICONS,
  FORUM_CATEGORIES,
  type ForumCategory,
  type ForumThread,
  fetchThreads,
} from '@/lib/forums';
import { useTabBarSpace } from '@/lib/layout';
import { timeAgo } from '@/lib/time';

export default function ForumsScreen() {
  const router = useRouter();
  const tabBarSpace = useTabBarSpace();
  const { top } = useSafeAreaInsets();
  const [category, setCategory] = useState<ForumCategory | null>(null);
  const [threads, setThreads] = useState<{ category: ForumCategory | null; list: ForumThread[] } | null>(null);
  const [failed, setFailed] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const list = threads && threads.category === category ? threads.list : null;

  const load = useCallback(async () => {
    try {
      setThreads({ category, list: await fetchThreads(category) });
      setFailed(false);
    } catch (error) {
      console.warn('Failed to load threads', error);
      setFailed(true);
      setThreads({ category, list: [] });
    }
  }, [category]);

  // Reload on every visit and whenever the category changes.
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
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
        {[null, ...FORUM_CATEGORIES].map((c) => {
          const active = c === category;
          return (
            <Pressable
              key={c ?? 'all'}
              onPress={() => setCategory(c)}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              style={[styles.chip, active && styles.chipActive]}>
              {c ? (
                <Ionicons
                  name={CATEGORY_ICONS[c]}
                  size={14}
                  color={active ? Colors.light.onTint : Colors.light.tint}
                />
              ) : null}
              <Text style={[styles.chipText, active && styles.chipTextActive]}>{c ?? 'All'}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );

  return (
    <FlatList
      style={styles.wrap}
      contentContainerStyle={[styles.content, { paddingTop: top + 16, paddingBottom: tabBarSpace }]}
      data={list ?? []}
      keyExtractor={(item) => item.id}
      ListHeaderComponent={header}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.light.tint} />
      }
      ListEmptyComponent={
        list === null ? (
          <ActivityIndicator color={Colors.light.tint} style={styles.loading} />
        ) : (
          <View style={styles.empty}>
            <Ionicons
              name={failed ? 'cloud-offline-outline' : 'chatbubbles-outline'}
              size={38}
              color={Colors.light.tint}
            />
            <Text style={styles.emptyTitle}>{failed ? 'Couldn’t load the forums' : 'No threads yet'}</Text>
            <Text style={styles.emptyText}>
              {failed
                ? 'Pull down to try again. If this keeps happening, the forums database update may not be installed yet.'
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
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    backgroundColor: Colors.light.background,
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
    backgroundColor: Colors.light.card,
    borderWidth: 1,
    borderColor: Colors.light.border,
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
