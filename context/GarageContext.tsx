import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { useAuth } from '@/context/AuthContext';
import { isMissingFollows } from '@/lib/follows';
import { type PickedMedia, readUpload, storagePath } from '@/lib/media';
import {
  BUCKET,
  fetchFeedPage,
  fetchSaved,
  POST_SELECT,
  toPost,
  type FeedMode,
  type FeedPage,
  type PostRow,
  VIDEO_BUCKET,
} from '@/lib/posts';
import { supabase } from '@/lib/supabase';
import type { Post, User } from '@/types';

/** media: one video, or 1–10 photos (a carousel when there's more than one). */
type NewPost = { media: PickedMedia[]; caption: string; car: string; carId?: string | null };

/** Storage says "Bucket not found" until the media-safety migration has created it. */
function videoUploadError(error: Error): Error {
  return /bucket not found/i.test(error.message)
    ? new Error('Video posts need the latest database update. Share a photo for now.')
    : error;
}

type GarageContextValue = {
  ready: boolean;
  user: User | null;
  posts: Post[];
  loadingPosts: boolean;
  /** The latest feed load failed (e.g. offline); cleared by the next successful load. */
  feedError: boolean;
  /** Everyone's posts, or only people you follow. */
  feedMode: FeedMode;
  setFeedMode: (mode: FeedMode) => void;
  /** The Following feed needs the follows database update. */
  followingUnavailable: boolean;
  refreshing: boolean;
  refresh: () => Promise<void>;
  hasMore: boolean;
  loadingMore: boolean;
  loadMore: () => Promise<void>;
  signOut: () => Promise<void>;
  addPost: (input: NewPost) => Promise<void>;
  deletePost: (postId: string) => Promise<void>;
  updateCaption: (postId: string, caption: string) => Promise<void>;
  toggleLike: (postId: string) => Promise<void>;
  saved: Post[];
  savedIds: Set<string>;
  toggleSave: (postId: string) => Promise<void>;
  adjustCommentCount: (postId: string, delta: number) => void;
  /** Drops posts from the feed and saves on this device (after a report or a block). */
  forgetPosts: (match: (post: Post) => boolean) => void;
};

const GarageContext = createContext<GarageContextValue | null>(null);

function setLiked(posts: Post[], postId: string, userId: string, liked: boolean): Post[] {
  return posts.map((post) => {
    if (post.id !== postId) return post;
    const others = post.likedBy.filter((id) => id !== userId);
    return { ...post, likedBy: liked ? [...others, userId] : others };
  });
}

export function GarageProvider({ children }: { children: ReactNode }) {
  const { user, isLoading, signOut } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [page, setPage] = useState<Omit<FeedPage, 'posts'>>({ cursor: null, hasMore: false });
  const [feedMode, setFeedModeState] = useState<FeedMode>('all');
  // Which user + feed mode has finished its first load; the feed shows a spinner until it matches.
  const [loadedFor, setLoadedFor] = useState<string | null>(null);
  const [followingUnavailable, setFollowingUnavailable] = useState(false);
  const [saved, setSaved] = useState<Post[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [feedError, setFeedError] = useState(false);
  const userId = user?.id;
  const feedKey = userId ? `${userId}:${feedMode}` : null;

  const applyFirstPage = useCallback((first: FeedPage) => {
    setPosts(first.posts);
    setPage({ cursor: first.cursor, hasMore: first.hasMore });
    setFeedError(false);
    setFollowingUnavailable(false);
  }, []);

  const failFeed = useCallback((error: unknown) => {
    console.warn('Failed to load posts', error);
    if (isMissingFollows(error)) setFollowingUnavailable(true);
    else setFeedError(true);
  }, []);

  const setFeedMode = useCallback((mode: FeedMode) => {
    setFeedModeState(mode);
    setPosts([]);
    setPage({ cursor: null, hasMore: false });
    setFeedError(false);
    setFollowingUnavailable(false);
  }, []);

  useEffect(() => {
    if (!userId || !feedKey) return;
    let cancelled = false;
    fetchFeedPage(null, feedMode)
      .then((first) => {
        if (!cancelled) applyFirstPage(first);
      })
      .catch((error) => {
        if (!cancelled) failFeed(error);
      })
      .finally(() => {
        if (!cancelled) setLoadedFor(feedKey);
      });
    return () => {
      cancelled = true;
    };
  }, [userId, feedKey, feedMode, applyFirstPage, failFeed]);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    // Loaded separately so a problem with saves never blanks the feed.
    fetchSaved()
      .then((next) => {
        if (!cancelled) setSaved(next);
      })
      .catch((error) => console.warn('Failed to load saved posts', error));
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const [first, nextSaved] = await Promise.allSettled([fetchFeedPage(null, feedMode), fetchSaved()]);
      if (first.status === 'fulfilled') applyFirstPage(first.value);
      else failFeed(first.reason);
      if (nextSaved.status === 'fulfilled') setSaved(nextSaved.value);
      else console.warn('Failed to load saved posts', nextSaved.reason);
    } finally {
      setRefreshing(false);
    }
  }, [applyFirstPage, failFeed, feedMode]);

  const loadMore = useCallback(async () => {
    if (!page.hasMore || loadingMore || refreshing) return;
    setLoadingMore(true);
    try {
      const next = await fetchFeedPage(page.cursor, feedMode);
      setPosts((current) => {
        const seen = new Set(current.map((post) => post.id));
        return [...current, ...next.posts.filter((post) => !seen.has(post.id))];
      });
      setPage({ cursor: next.cursor, hasMore: next.hasMore });
    } catch (error) {
      console.warn('Failed to load more posts', error);
    } finally {
      setLoadingMore(false);
    }
  }, [page, loadingMore, refreshing, feedMode]);

  const addPost = useCallback(
    async (input: NewPost) => {
      if (!userId) throw new Error('You need to be signed in to post.');
      const [media, ...morePhotos] = input.media;
      if (!media) throw new Error('Pick a photo or video first.');
      const isVideo = media.kind === 'video';
      if (isVideo && !media.posterUri) throw new Error('Pick the video again so we can make its cover.');
      if (isVideo && morePhotos.length > 0) throw new Error('Post a video on its own.');

      // Byte-level checks run before anything leaves the device.
      const image = await readUpload(isVideo ? media.posterUri! : media.uri, 'image');
      const video = isVideo ? await readUpload(media.uri, 'video') : null;
      const imagePath = storagePath(userId, isVideo ? 'poster' : '', image.ext);
      const videoPath = video ? storagePath(userId, 'video', video.ext) : null;
      const extraPaths: string[] = [];

      const uploaded: { bucket: string; path: string }[] = [];
      const cleanUp = () =>
        Promise.all(uploaded.map(({ bucket, path }) => supabase.storage.from(bucket).remove([path])));
      try {
        const imageUpload = await supabase.storage
          .from(BUCKET)
          .upload(imagePath, image.body, { contentType: image.contentType });
        if (imageUpload.error) throw imageUpload.error;
        uploaded.push({ bucket: BUCKET, path: imagePath });

        if (video && videoPath) {
          const videoUpload = await supabase.storage
            .from(VIDEO_BUCKET)
            .upload(videoPath, video.body, { contentType: video.contentType });
          if (videoUpload.error) throw videoUploadError(videoUpload.error);
          uploaded.push({ bucket: VIDEO_BUCKET, path: videoPath });
        }

        // Carousel photos, one at a time to keep memory low.
        for (const photo of morePhotos) {
          const extra = await readUpload(photo.uri, 'image');
          const extraPath = storagePath(userId, '', extra.ext);
          const extraUpload = await supabase.storage
            .from(BUCKET)
            .upload(extraPath, extra.body, { contentType: extra.contentType });
          if (extraUpload.error) throw extraUpload.error;
          uploaded.push({ bucket: BUCKET, path: extraPath });
          extraPaths.push(extraPath);
        }

        const row = {
          image_path: imagePath,
          car: input.car.trim(),
          caption: input.caption.trim(),
          ...(videoPath ? { video_path: videoPath } : {}),
          ...(input.carId ? { car_id: input.carId } : {}),
          ...(extraPaths.length ? { extra_image_paths: extraPaths } : {}),
        };
        const { data, error } = await supabase.from('posts').insert(row).select(POST_SELECT).single();
        if (error?.code === 'PGRST204' && extraPaths.length) {
          throw new Error('Carousel posts need the latest database update. Share one photo for now.');
        }
        if (error) throw error;

        const post = toPost(data as unknown as PostRow);
        setPosts((current) => [post, ...current]);
      } catch (error) {
        await cleanUp().catch(() => {});
        throw error;
      }
    },
    [userId]
  );

  const deletePost = useCallback(
    async (postId: string) => {
      const post = posts.find((p) => p.id === postId) ?? saved.find((p) => p.id === postId);
      if (!userId || !post || post.authorId !== userId) return;

      // RLS turns a disallowed delete into "0 rows" rather than an error, so check the result.
      const { data, error } = await supabase.from('posts').delete().eq('id', postId).select('id');
      if (error) throw error;
      if (!data?.length) {
        throw new Error('The database did not allow this delete. Run the latest SQL migration.');
      }
      // Best effort: the post is already gone even if the photo cleanup fails.
      const removal = await supabase.storage.from(BUCKET).remove([post.imagePath, ...post.extraImagePaths]);
      if (removal.error) console.warn('Failed to delete photos', removal.error);
      if (post.videoPath) {
        const videoRemoval = await supabase.storage.from(VIDEO_BUCKET).remove([post.videoPath]);
        if (videoRemoval.error) console.warn('Failed to delete video', videoRemoval.error);
      }

      setPosts((current) => current.filter((p) => p.id !== postId));
      setSaved((current) => current.filter((p) => p.id !== postId));
    },
    [posts, saved, userId]
  );

  const updateCaption = useCallback(async (postId: string, caption: string) => {
    const next = caption.trim();
    const { data, error } = await supabase
      .from('posts')
      .update({ caption: next })
      .eq('id', postId)
      .select('id');
    if (error) throw error;
    if (!data?.length) {
      throw new Error('The database did not allow this edit. Run the latest SQL migration.');
    }
    const apply = (list: Post[]) =>
      list.map((post) => (post.id === postId ? { ...post, caption: next } : post));
    setPosts(apply);
    setSaved(apply);
  }, []);

  const toggleLike = useCallback(
    async (postId: string) => {
      if (!userId) return;
      const liked = posts.find((post) => post.id === postId)?.likedBy.includes(userId) ?? false;

      // Optimistic update; roll back if the write fails.
      setPosts((current) => setLiked(current, postId, userId, !liked));
      const { error } = liked
        ? await supabase.from('likes').delete().eq('post_id', postId).eq('user_id', userId)
        : await supabase
            .from('likes')
            .upsert({ post_id: postId, user_id: userId }, { ignoreDuplicates: true });
      if (error) {
        console.warn('Failed to update like', error);
        setPosts((current) => setLiked(current, postId, userId, liked));
      }
    },
    [posts, userId]
  );

  const toggleSave = useCallback(
    async (postId: string) => {
      if (!userId) return;
      const existing = saved.find((post) => post.id === postId);
      const post = existing ?? posts.find((p) => p.id === postId);
      if (!post) return;

      // Optimistic update; roll back if the write fails.
      setSaved((current) =>
        existing ? current.filter((p) => p.id !== postId) : [post, ...current]
      );
      const { error } = existing
        ? await supabase.from('saved_posts').delete().eq('post_id', postId).eq('user_id', userId)
        : await supabase
            .from('saved_posts')
            .upsert({ post_id: postId, user_id: userId }, { ignoreDuplicates: true });
      if (error) {
        console.warn('Failed to update save', error);
        setSaved((current) =>
          existing ? [post, ...current] : current.filter((p) => p.id !== postId)
        );
      }
    },
    [posts, saved, userId]
  );

  const savedIds = useMemo(() => new Set(saved.map((post) => post.id)), [saved]);

  // Keeps the feed's comment count in sync after commenting on the comments screen.
  const adjustCommentCount = useCallback((postId: string, delta: number) => {
    setPosts((current) =>
      current.map((post) =>
        post.id === postId
          ? { ...post, commentCount: Math.max(0, post.commentCount + delta) }
          : post
      )
    );
  }, []);

  const forgetPosts = useCallback((match: (post: Post) => boolean) => {
    setPosts((current) => current.filter((post) => !match(post)));
    setSaved((current) => current.filter((post) => !match(post)));
  }, []);

  const value = useMemo(
    () => ({
      ready: !isLoading,
      user,
      posts,
      loadingPosts: !!feedKey && loadedFor !== feedKey,
      feedError,
      feedMode,
      setFeedMode,
      followingUnavailable,
      refreshing,
      refresh,
      hasMore: page.hasMore,
      loadingMore,
      loadMore,
      signOut,
      addPost,
      deletePost,
      updateCaption,
      toggleLike,
      saved,
      savedIds,
      toggleSave,
      adjustCommentCount,
      forgetPosts,
    }),
    [
      isLoading,
      user,
      feedKey,
      posts,
      loadedFor,
      feedError,
      feedMode,
      setFeedMode,
      followingUnavailable,
      refreshing,
      refresh,
      page.hasMore,
      loadingMore,
      loadMore,
      signOut,
      addPost,
      deletePost,
      updateCaption,
      toggleLike,
      saved,
      savedIds,
      toggleSave,
      adjustCommentCount,
      forgetPosts,
    ]
  );

  return <GarageContext.Provider value={value}>{children}</GarageContext.Provider>;
}

export function useGarage() {
  const ctx = useContext(GarageContext);
  if (!ctx) throw new Error('useGarage must be used inside GarageProvider');
  return ctx;
}
