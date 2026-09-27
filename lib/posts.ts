import { supabase } from '@/lib/supabase';
import type { Post } from '@/types';

export const BUCKET = 'post-images';
export const PAGE_SIZE = 20;

// posts → profiles has several paths (author_id, likes, comments, saves), so name the FK.
export const POST_SELECT =
  'id, author_id, image_path, car, caption, created_at, author:profiles!posts_author_id_fkey(username), likes(user_id), comments(count)';

export type PostRow = {
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

export function toPost(row: PostRow): Post {
  return {
    id: row.id,
    authorId: row.author_id,
    authorName: row.author?.username ?? 'driver',
    imagePath: row.image_path,
    imageUri: supabase.storage.from(BUCKET).getPublicUrl(row.image_path).data.publicUrl,
    caption: row.caption,
    car: row.car,
    createdAt: Date.parse(row.created_at),
    likedBy: row.likes.map((like) => like.user_id),
    commentCount: row.comments[0]?.count ?? 0,
  };
}

export type FeedPage = { posts: Post[]; cursor: string | null; hasMore: boolean };

/** One page of the feed, newest first. Pass the previous page's cursor to get older posts. */
export async function fetchFeedPage(cursor?: string | null): Promise<FeedPage> {
  let query = supabase
    .from('posts')
    .select(POST_SELECT)
    .order('created_at', { ascending: false })
    .limit(PAGE_SIZE);
  if (cursor) query = query.lt('created_at', cursor);

  const { data, error } = await query;
  if (error) throw error;
  const rows = data as unknown as PostRow[];
  return {
    posts: rows.map(toPost),
    // Raw timestamp (microsecond precision) so the next page starts exactly after this one.
    cursor: rows.at(-1)?.created_at ?? cursor ?? null,
    hasMore: rows.length === PAGE_SIZE,
  };
}

/** Every post by one user, newest first. */
export async function fetchUserPosts(authorId: string): Promise<Post[]> {
  const { data, error } = await supabase
    .from('posts')
    .select(POST_SELECT)
    .eq('author_id', authorId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data as unknown as PostRow[]).map(toPost);
}

/** The signed-in user's saved posts, newest save first (RLS limits rows to their own). */
export async function fetchSaved(): Promise<Post[]> {
  const { data, error } = await supabase
    .from('saved_posts')
    .select(`created_at, post:posts(${POST_SELECT})`)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data as unknown as { post: PostRow | null }[]).flatMap((row) =>
    row.post ? [toPost(row.post)] : []
  );
}

/** A single post by id, or null if it no longer exists. */
export async function fetchPost(postId: string): Promise<Post | null> {
  const { data, error } = await supabase
    .from('posts')
    .select(POST_SELECT)
    .eq('id', postId)
    .maybeSingle();
  if (error) throw error;
  return data ? toPost(data as unknown as PostRow) : null;
}
