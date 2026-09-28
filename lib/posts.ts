import { supabase } from '@/lib/supabase';
import type { Post } from '@/types';

export const BUCKET = 'post-images';
export const VIDEO_BUCKET = 'post-videos';
export const PAGE_SIZE = 20;

// "*" picks up columns added by later migrations (video_path, car_id) once they exist and
// simply leaves them out before, so the app works whichever migrations have been run.
// posts → profiles has several paths (author_id, likes, comments, saves), so name the FK.
export const POST_SELECT =
  '*, author:profiles!posts_author_id_fkey(username), likes(user_id), comments(count)';

export type PostRow = {
  id: string;
  author_id: string;
  image_path: string;
  video_path?: string | null;
  extra_image_paths?: string[] | null;
  car_id?: string | null;
  event_id?: string | null;
  car: string;
  caption: string;
  created_at: string;
  author: { username: string } | null;
  likes: { user_id: string }[];
  comments: { count: number }[];
};

export function toPost(row: PostRow): Post {
  const imageUrl = (path: string) => supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
  const extraImagePaths = row.extra_image_paths ?? [];
  return {
    id: row.id,
    authorId: row.author_id,
    authorName: row.author?.username ?? 'driver',
    imagePath: row.image_path,
    imageUri: imageUrl(row.image_path),
    extraImagePaths,
    imageUris: [row.image_path, ...extraImagePaths].map(imageUrl),
    videoPath: row.video_path ?? null,
    videoUri: row.video_path
      ? supabase.storage.from(VIDEO_BUCKET).getPublicUrl(row.video_path).data.publicUrl
      : null,
    carId: row.car_id ?? null,
    eventId: row.event_id ?? null,
    caption: row.caption,
    car: row.car,
    createdAt: Date.parse(row.created_at),
    likedBy: row.likes.map((like) => like.user_id),
    commentCount: row.comments[0]?.count ?? 0,
  };
}

export type FeedPage = { posts: Post[]; cursor: string | null; hasMore: boolean };
/** 'all' = everyone's posts; 'following' = people you follow, plus your own. */
export type FeedMode = 'all' | 'following';

/** One page of the feed, newest first. Pass the previous page's cursor to get older posts. */
export async function fetchFeedPage(cursor?: string | null, mode: FeedMode = 'all'): Promise<FeedPage> {
  // following_posts() returns rows of posts, so PostgREST can embed and filter them the same way.
  const source =
    mode === 'following'
      ? supabase.rpc('following_posts').select(POST_SELECT)
      : supabase.from('posts').select(POST_SELECT);
  const filtered = cursor ? source.lt('created_at', cursor) : source;
  const { data, error } = await filtered.order('created_at', { ascending: false }).limit(PAGE_SIZE);
  if (error) throw error;
  const rows = data as unknown as PostRow[];
  return {
    posts: rows.map(toPost),
    // Raw timestamp (microsecond precision) so the next page starts exactly after this one.
    cursor: rows.at(-1)?.created_at ?? cursor ?? null,
    hasMore: rows.length === PAGE_SIZE,
  };
}

/** The most-liked post of the last 7 days (null if nothing was liked, or before the migration). */
export async function fetchCarOfTheWeek(): Promise<Post | null> {
  const { data, error } = await supabase.rpc('car_of_the_week').select(POST_SELECT).maybeSingle();
  if (error) {
    if (error.code === 'PGRST202' || error.code === '42883') return null;
    throw error;
  }
  return data ? toPost(data as unknown as PostRow) : null;
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

/** Posts tagged with one garage car, newest first ([] before the car-tags migration). */
export async function fetchCarPosts(carId: string): Promise<Post[]> {
  const { data, error } = await supabase
    .from('posts')
    .select(POST_SELECT)
    .eq('car_id', carId)
    .order('created_at', { ascending: false });
  if (error) {
    if (error.code === '42703') return [];
    throw error;
  }
  return (data as unknown as PostRow[]).map(toPost);
}

/** Posts tagged with a car meet, newest first ([] before the meet-photos migration). */
export async function fetchEventPosts(eventId: string): Promise<Post[]> {
  const { data, error } = await supabase
    .from('posts')
    .select(POST_SELECT)
    .eq('event_id', eventId)
    .order('created_at', { ascending: false });
  if (error) {
    if (error.code === '42703') return [];
    throw error;
  }
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
  const { data, error } = await supabase.from('posts').select(POST_SELECT).eq('id', postId).maybeSingle();
  if (error) throw error;
  return data ? toPost(data as unknown as PostRow) : null;
}
