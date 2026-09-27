import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { useAuth } from '@/context/AuthContext';
import {
  BUCKET,
  fetchFeedPage,
  fetchSaved,
  POST_SELECT,
  toPost,
  type FeedPage,
  type PostRow,
} from '@/lib/posts';
import { supabase } from '@/lib/supabase';
import type { Post, User } from '@/types';

type NewPost = { imageUri: string; mimeType?: string; caption: string; car: string };

type GarageContextValue = {
  ready: boolean;
  user: User | null;
  posts: Post[];
  loadingPosts: boolean;
  /** The latest feed load failed (e.g. offline); cleared by the next successful load. */
  feedError: boolean;
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
  // Which user's feed has finished its first load; the feed shows a spinner until it matches.
  const [loadedFor, setLoadedFor] = useState<string | null>(null);
  const [saved, setSaved] = useState<Post[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [feedError, setFeedError] = useState(false);
  const userId = user?.id;

  const applyFirstPage = useCallback((first: FeedPage) => {
    setPosts(first.posts);
    setPage({ cursor: first.cursor, hasMore: first.hasMore });
    setFeedError(false);
  }, []);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    fetchFeedPage()
      .then((first) => {
        if (!cancelled) applyFirstPage(first);
      })
      .catch((error) => {
        console.warn('Failed to load posts', error);
        if (!cancelled) setFeedError(true);
      })
      .finally(() => {
        if (!cancelled) setLoadedFor(userId);
      });
    // Loaded separately so a problem with saves never blanks the feed.
    fetchSaved()
      .then((next) => {
        if (!cancelled) setSaved(next);
      })
      .catch((error) => console.warn('Failed to load saved posts', error));
    return () => {
      cancelled = true;
    };
  }, [userId, applyFirstPage]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const [first, nextSaved] = await Promise.allSettled([fetchFeedPage(), fetchSaved()]);
      if (first.status === 'fulfilled') applyFirstPage(first.value);
      else {
        console.warn('Failed to load posts', first.reason);
        setFeedError(true);
      }
      if (nextSaved.status === 'fulfilled') setSaved(nextSaved.value);
      else console.warn('Failed to load saved posts', nextSaved.reason);
    } finally {
      setRefreshing(false);
    }
  }, [applyFirstPage]);

  const loadMore = useCallback(async () => {
    if (!page.hasMore || loadingMore || refreshing) return;
    setLoadingMore(true);
    try {
      const next = await fetchFeedPage(page.cursor);
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
  }, [page, loadingMore, refreshing]);

  const addPost = useCallback(
    async (input: NewPost) => {
      if (!userId) throw new Error('You need to be signed in to post.');

      const contentType = input.mimeType ?? 'image/jpeg';
      const ext = contentType.split('/')[1]?.replace('jpeg', 'jpg') ?? 'jpg';
      const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

      const body = await (await fetch(input.imageUri)).arrayBuffer();
      const upload = await supabase.storage.from(BUCKET).upload(path, body, { contentType });
      if (upload.error) throw upload.error;

      const { data, error } = await supabase
        .from('posts')
        .insert({ image_path: path, car: input.car.trim(), caption: input.caption.trim() })
        .select(POST_SELECT)
        .single();
      if (error) {
        await supabase.storage.from(BUCKET).remove([path]);
        throw error;
      }

      const post = toPost(data as unknown as PostRow);
      setPosts((current) => [post, ...current]);
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
      const removal = await supabase.storage.from(BUCKET).remove([post.imagePath]);
      if (removal.error) console.warn('Failed to delete photo', removal.error);

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

  const value = useMemo(
    () => ({
      ready: !isLoading,
      user,
      posts,
      loadingPosts: !!userId && loadedFor !== userId,
      feedError,
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
    }),
    [
      isLoading,
      user,
      userId,
      posts,
      loadedFor,
      feedError,
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
    ]
  );

  return <GarageContext.Provider value={value}>{children}</GarageContext.Provider>;
}

export function useGarage() {
  const ctx = useContext(GarageContext);
  if (!ctx) throw new Error('useGarage must be used inside GarageProvider');
  return ctx;
}
