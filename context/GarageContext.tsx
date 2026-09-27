import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import type { Post, User } from '@/types';

const BUCKET = 'post-images';
const FEED_LIMIT = 100;

// posts → profiles has two paths (author_id and via likes), so name the FK explicitly.
const POST_SELECT =
  'id, author_id, image_path, car, caption, created_at, author:profiles!posts_author_id_fkey(username), likes(user_id), comments(count)';

type PostRow = {
  id: string;
  author_id: string;
  image_path: string;
  car: string;
  caption: string;
  created_at: string;
  author: { username: string } | null;
  likes: { user_id: string }[];
  comments: { count: number }[];
};

type NewPost = { imageUri: string; mimeType?: string; caption: string; car: string };

type GarageContextValue = {
  ready: boolean;
  user: User | null;
  posts: Post[];
  refreshing: boolean;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
  addPost: (input: NewPost) => Promise<void>;
  toggleLike: (postId: string) => Promise<void>;
  adjustCommentCount: (postId: string, delta: number) => void;
};

const GarageContext = createContext<GarageContextValue | null>(null);

function toPost(row: PostRow): Post {
  return {
    id: row.id,
    authorId: row.author_id,
    authorName: row.author?.username ?? 'driver',
    imageUri: supabase.storage.from(BUCKET).getPublicUrl(row.image_path).data.publicUrl,
    caption: row.caption,
    car: row.car,
    createdAt: Date.parse(row.created_at),
    likedBy: row.likes.map((like) => like.user_id),
    commentCount: row.comments[0]?.count ?? 0,
  };
}

async function fetchPosts(): Promise<Post[]> {
  const { data, error } = await supabase
    .from('posts')
    .select(POST_SELECT)
    .order('created_at', { ascending: false })
    .limit(FEED_LIMIT);
  if (error) throw error;
  return (data as unknown as PostRow[]).map(toPost);
}

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
  const [refreshing, setRefreshing] = useState(false);
  const userId = user?.id;

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    fetchPosts()
      .then((next) => {
        if (!cancelled) setPosts(next);
      })
      .catch((error) => console.warn('Failed to load posts', error));
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      setPosts(await fetchPosts());
    } catch (error) {
      console.warn('Failed to load posts', error);
    } finally {
      setRefreshing(false);
    }
  }, []);

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
      refreshing,
      refresh,
      signOut,
      addPost,
      toggleLike,
      adjustCommentCount,
    }),
    [isLoading, user, posts, refreshing, refresh, signOut, addPost, toggleLike, adjustCommentCount]
  );

  return <GarageContext.Provider value={value}>{children}</GarageContext.Provider>;
}

export function useGarage() {
  const ctx = useContext(GarageContext);
  if (!ctx) throw new Error('useGarage must be used inside GarageProvider');
  return ctx;
}
