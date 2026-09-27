import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter, useScrollToTop } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  type FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  type ViewToken,
} from 'react-native';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CarOfTheWeek } from '@/components/CarOfTheWeek';
import { Chip } from '@/components/Chip';
import { FeedHeader, useFeedHeaderHeight } from '@/components/FeedHeader';
import { GlassBackdrop } from '@/components/GlassBackdrop';
import { OptionsSheet, type SheetOption } from '@/components/OptionsSheet';
import { PostCard } from '@/components/PostCard';
import { confirmBlock, useReportSheet } from '@/components/SafetyActions';
import Colors from '@/constants/Colors';
import { useGarage } from '@/context/GarageContext';
import { confirm, showError } from '@/lib/confirm';
import { useTabBarSpace } from '@/lib/layout';
import { fetchCarOfTheWeek } from '@/lib/posts';
import { sharePost } from '@/lib/share';
import { useNewPostsCount } from '@/lib/useNewPostsCount';
import type { Post } from '@/types';

const SNAP_MS = 180;
// A video starts playing once most of it is on screen.
const VIEWABILITY = { itemVisiblePercentThreshold: 60 };

export default function FeedScreen() {
  const {
    posts,
    user,
    loadingPosts,
    feedError,
    toggleLike,
    savedIds,
    toggleSave,
    deletePost,
    refreshing,
    refresh,
    hasMore,
    loadingMore,
    loadMore,
    forgetPosts,
    feedMode,
    setFeedMode,
    followingUnavailable,
  } = useGarage();
  const router = useRouter();
  const { top } = useSafeAreaInsets();
  const headerHeight = useFeedHeaderHeight();
  const tabBarSpace = useTabBarSpace();
  // The "new posts" pill counts everyone's posts, so it only shows on the Everyone feed.
  const newPosts = useNewPostsCount(feedMode === 'all' ? (posts[0]?.createdAt ?? null) : null);
  const [optionsFor, setOptionsFor] = useState<Post | null>(null);
  const [activeVideoId, setActiveVideoId] = useState<string | null>(null);
  const [topPost, setTopPost] = useState<Post | null>(null);

  const loadTopPost = useCallback(() => {
    fetchCarOfTheWeek()
      .then(setTopPost)
      .catch((error) => console.warn('Failed to load car of the week', error));
  }, []);
  useEffect(loadTopPost, [loadTopPost]);

  const onRefresh = () => {
    refresh();
    loadTopPost();
  };

  const { openReport, reportSheet } = useReportSheet((target) => {
    forgetPosts((post) => post.id === target.id);
    setTopPost((top) => (top?.id === target.id ? null : top));
  });

  const block = async (post: Post) => {
    if (await confirmBlock(post.authorId, post.authorName)) {
      forgetPosts((p) => p.authorId === post.authorId);
      setTopPost((top) => (top?.authorId === post.authorId ? null : top));
    }
  };

  // The first video that's mostly on screen plays; everything else shows its poster.
  const onViewableItemsChanged = useCallback(({ viewableItems }: { viewableItems: ViewToken<Post>[] }) => {
    const video = viewableItems.find((token) => token.isViewable && token.item.videoUri);
    setActiveVideoId(video ? video.item.id : null);
  }, []);

  const openCar = (carId: string | null) =>
    carId && router.push({ pathname: '/garage/[carId]', params: { carId } });

  const openProfile = (post: Post) =>
    router.push({
      pathname: '/user/[userId]',
      params: { userId: post.authorId, name: post.authorName },
    });

  const share = (post: Post) =>
    sharePost(post).catch((error) => showError('Could not share', error));

  const remove = async (post: Post) => {
    const ok = await confirm(
      'Delete this post?',
      'The photo or video, likes and comments will be removed for everyone. This can’t be undone.',
      'Delete'
    );
    if (!ok) return;
    try {
      await deletePost(post.id);
    } catch (error) {
      showError('Could not delete', error);
    }
  };

  // "…" menu: edit/delete on your own posts, report/block on everyone else's.
  const menuFor = (post: Post): SheetOption[] =>
    post.authorId === user?.id
      ? [
          {
            label: 'Edit caption',
            icon: 'create-outline',
            onPress: () => router.push({ pathname: '/edit-post/[postId]', params: { postId: post.id } }),
          },
          { label: 'Share', icon: 'paper-plane-outline', onPress: () => share(post) },
          { label: 'Delete post', icon: 'trash-outline', destructive: true, onPress: () => remove(post) },
        ]
      : [
          { label: 'Share', icon: 'paper-plane-outline', onPress: () => share(post) },
          {
            label: 'Report post',
            icon: 'flag-outline',
            destructive: true,
            onPress: () => openReport({ kind: 'post', id: post.id }),
          },
          {
            label: `Block @${post.authorName}`,
            icon: 'ban-outline',
            destructive: true,
            onPress: () => block(post),
          },
        ];

  // On iOS the list is pushed below the header with contentInset (so pull-to-refresh
  // shows under the header), which makes scroll offsets start at -headerHeight.
  const isIOS = Platform.OS === 'ios';
  const insetOffset = isIOS ? headerHeight : 0;

  // 0 = header fully shown, -headerHeight = fully hidden.
  const shift = useSharedValue(0);
  const lastY = useSharedValue(0);

  const snap = (y: number) => {
    'worklet';
    const current = shift.get();
    if (current === 0 || current === -headerHeight) return;
    const hide = current < -headerHeight / 2 && y > headerHeight;
    shift.set(withTiming(hide ? -headerHeight : 0, { duration: SNAP_MS }));
  };

  // Tapping the Feed tab while on it scrolls to the top and brings the header back.
  const listRef = useRef<FlatList<Post>>(null);
  const scrollTarget = useRef({
    scrollToTop: () => {
      shift.set(withTiming(0, { duration: SNAP_MS }));
      listRef.current?.scrollToOffset({ offset: -insetOffset, animated: true });
    },
  });
  useScrollToTop(scrollTarget);

  const onScroll = useAnimatedScrollHandler({
    onScroll: (event) => {
      const y = event.contentOffset.y + insetOffset;
      const dy = y - lastY.get();
      lastY.set(y);
      if (y <= 0) {
        shift.set(0); // at (or pulled past) the top: always show the header
        return;
      }
      // Ignore the bounce past the bottom so it doesn't pop the header back in.
      if (event.contentOffset.y > event.contentSize.height - event.layoutMeasurement.height) return;
      shift.set(Math.min(0, Math.max(-headerHeight, shift.get() - dy)));
    },
    onEndDrag: (event) => snap(event.contentOffset.y + insetOffset),
    onMomentumEnd: (event) => snap(event.contentOffset.y + insetOffset),
  });

  const headerStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: shift.get() }],
  }));

  // The "new posts" pill rides just below the header, and stops under the status bar
  // once the header has scrolled away.
  const pillStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: Math.max(shift.get(), top - headerHeight) }],
  }));

  const showNewPosts = () => {
    scrollTarget.current.scrollToTop();
    onRefresh();
  };

  // Fades in a page-colored strip behind the status bar as the header leaves.
  const statusBarStyle = useAnimatedStyle(() => ({
    opacity: interpolate(shift.get(), [-Math.max(top, 1), 0], [1, 0], Extrapolation.CLAMP),
  }));

  return (
    <View style={styles.wrap}>
      <GlassBackdrop />
      <Animated.FlatList
        ref={listRef}
        data={posts}
        keyExtractor={(item: Post) => item.id}
        renderItem={({ item }: { item: Post }) => (
          <PostCard
            post={item}
            active={item.id === activeVideoId}
            liked={!!user && item.likedBy.includes(user.id)}
            onLike={() => toggleLike(item.id)}
            onComment={() =>
              router.push({ pathname: '/comments/[postId]', params: { postId: item.id } })
            }
            saved={savedIds.has(item.id)}
            onSave={() => toggleSave(item.id)}
            onShare={() => share(item)}
            onAuthorPress={() => openProfile(item)}
            onLikesPress={() =>
              router.push({ pathname: '/likes/[postId]', params: { postId: item.id } })
            }
            onCarPress={
              item.carId
                ? () => openCar(item.carId)
                : undefined
            }
            onOptions={() => setOptionsFor(item)}
          />
        )}
        onScroll={onScroll}
        scrollEventThrottle={16}
        viewabilityConfig={VIEWABILITY}
        onViewableItemsChanged={onViewableItemsChanged}
        refreshing={refreshing}
        onRefresh={onRefresh}
        progressViewOffset={headerHeight}
        automaticallyAdjustContentInsets={false}
        contentInset={isIOS ? { top: headerHeight } : undefined}
        contentOffset={isIOS ? { x: 0, y: -headerHeight } : undefined}
        scrollIndicatorInsets={isIOS ? { top: headerHeight } : undefined}
        onEndReached={loadMore}
        onEndReachedThreshold={0.6}
        ListHeaderComponent={
          <>
            <View style={styles.modes} accessibilityRole="tablist">
              <Chip label="Everyone" icon="globe-outline" active={feedMode === 'all'} onPress={() => setFeedMode('all')} />
              <Chip
                label="Following"
                icon="people-outline"
                active={feedMode === 'following'}
                onPress={() => setFeedMode('following')}
              />
            </View>
            {feedMode === 'all' && topPost ? (
              <CarOfTheWeek
                post={topPost}
                onPress={() =>
                  router.push({ pathname: '/comments/[postId]', params: { postId: topPost.id } })
                }
              />
            ) : null}
          </>
        }
        ListEmptyComponent={
          loadingPosts ? (
            <ActivityIndicator color={Colors.light.tint} style={styles.loading} />
          ) : followingUnavailable ? (
            <View style={styles.emptyBox}>
              <Text style={styles.empty}>The Following feed needs the latest database update.</Text>
            </View>
          ) : feedError ? (
            <View style={styles.emptyBox}>
              <Text style={styles.empty}>Couldn’t load the feed. Check your connection.</Text>
              <Text style={styles.retry} onPress={refresh} accessibilityRole="button">
                Try again
              </Text>
            </View>
          ) : feedMode === 'following' ? (
            <View style={styles.emptyBox}>
              <Text style={styles.empty}>
                Follow drivers to see their builds here. Find people with search, or tap a username in the feed.
              </Text>
              <Text style={styles.cta} onPress={() => router.push('/search')} accessibilityRole="button">
                Find drivers
              </Text>
            </View>
          ) : (
            <View style={styles.emptyBox}>
              <Text style={styles.empty}>No posts yet. Be the first to share your build.</Text>
              <Text
                style={styles.cta}
                onPress={() => router.push('/post')}
                accessibilityRole="button">
                Share your first build
              </Text>
            </View>
          )
        }
        ListFooterComponent={
          loadingMore ? (
            <ActivityIndicator color={Colors.light.tint} style={styles.footer} />
          ) : !hasMore && posts.length > 0 ? (
            <Text style={styles.end}>You’re all caught up 🏁</Text>
          ) : null
        }
        style={styles.list}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: tabBarSpace },
          !isIOS && { paddingTop: headerHeight },
        ]}
      />
      <Animated.View style={[styles.header, headerStyle]}>
        <FeedHeader />
      </Animated.View>
      {newPosts > 0 ? (
        <Animated.View
          pointerEvents="box-none"
          style={[styles.pillWrap, { top: headerHeight + 10 }, pillStyle]}>
          <Pressable
            onPress={showNewPosts}
            accessibilityRole="button"
            accessibilityLabel={`Show ${newPosts} new ${newPosts === 1 ? 'post' : 'posts'}`}
            style={({ pressed }) => [styles.pill, pressed && styles.pillPressed]}>
            <Ionicons name="arrow-up" size={14} color={Colors.light.onTint} />
            <Text style={styles.pillText}>
              {newPosts > 9 ? '9+' : newPosts} new {newPosts === 1 ? 'post' : 'posts'}
            </Text>
          </Pressable>
        </Animated.View>
      ) : null}
      <Animated.View
        pointerEvents="none"
        style={[styles.statusBar, { height: top }, statusBarStyle]}
      />
      <OptionsSheet
        visible={optionsFor !== null}
        onClose={() => setOptionsFor(null)}
        options={optionsFor ? menuFor(optionsFor) : []}
      />
      {reportSheet}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  list: {
    flex: 1,
  },
  content: {
    maxWidth: 640,
    width: '100%',
    alignSelf: 'center',
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  pillWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 12,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.light.tint,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
    shadowColor: Colors.light.text,
    shadowOpacity: 0.25,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  pillPressed: {
    opacity: 0.85,
  },
  pillText: {
    color: Colors.light.onTint,
    fontWeight: '800',
    fontSize: 13,
  },
  statusBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 11,
    backgroundColor: Colors.light.background,
  },
  loading: {
    marginTop: 48,
  },
  modes: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 12,
  },
  emptyBox: {
    alignItems: 'center',
    gap: 12,
  },
  cta: {
    color: Colors.light.onTint,
    backgroundColor: Colors.light.tint,
    fontWeight: '800',
    borderRadius: 12,
    overflow: 'hidden',
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  retry: {
    color: Colors.light.tint,
    fontWeight: '800',
    padding: 8,
  },
  footer: {
    marginVertical: 20,
  },
  end: {
    color: Colors.light.muted,
    textAlign: 'center',
    marginVertical: 20,
  },
  empty: {
    color: Colors.light.muted,
    textAlign: 'center',
    marginTop: 48,
    paddingHorizontal: 24,
  },
});
