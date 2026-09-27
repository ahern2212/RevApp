import { POST_SELECT, type PostRow, toPost } from '@/lib/posts';
import { type TagCount, topTags } from '@/lib/richText';
import { supabase } from '@/lib/supabase';
import type { Post } from '@/types';

const USER_LIMIT = 8;
const POST_LIMIT = 30;
const TRENDING_DAYS = 7;
const TRENDING_SAMPLE = 500;
const TRENDING_LIMIT = 12;

export type Driver = { id: string; username: string };
export type SearchResults = { drivers: Driver[]; posts: Post[] };

// Keep only characters that are safe inside a PostgREST filter string
// (commas, parentheses and wildcards would change the query's meaning). "#" is kept so
// tapping a hashtag searches for that exact tag.
export function cleanSearchQuery(query: string): string {
  return query.replace(/[^\p{L}\p{N}\s#._-]/gu, ' ').replace(/\s+/g, ' ').trim();
}

/** The most-used #tags in captions from the last week. */
export async function fetchTrendingTags(): Promise<TagCount[]> {
  const since = new Date(Date.now() - TRENDING_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from('posts')
    .select('caption')
    .gte('created_at', since)
    .like('caption', '%#%')
    .order('created_at', { ascending: false })
    .limit(TRENDING_SAMPLE);
  if (error) throw error;
  return topTags((data as { caption: string }[]).map((row) => row.caption), TRENDING_LIMIT);
}

// Missing function: the explore migration hasn't been run yet, so the section just hides.
const isMissingFunction = (code?: string) => code === 'PGRST202' || code === '42883';

/** The most-liked posts of the last two weeks. */
export async function fetchExplorePosts(): Promise<Post[]> {
  const { data, error } = await supabase.rpc('explore_posts').select(POST_SELECT);
  if (error) {
    if (isMissingFunction(error.code)) return [];
    throw error;
  }
  return (data as unknown as PostRow[]).map(toPost);
}

export type SuggestedDriver = { id: string; username: string; followers: number; mutuals: number };

/** Drivers you don't follow yet: followed by people you follow first, then the most followed. */
export async function fetchSuggestedDrivers(): Promise<SuggestedDriver[]> {
  const { data, error } = await supabase.rpc('suggested_drivers', { max_count: 10 });
  if (error) {
    if (isMissingFunction(error.code)) return [];
    throw error;
  }
  return (data as { id: string; username: string; followers: number | string; mutuals: number | string }[]).map(
    (row) => ({ id: row.id, username: row.username, followers: Number(row.followers), mutuals: Number(row.mutuals) })
  );
}

/** Drivers whose username matches, and posts whose car or caption matches. */
export async function search(query: string): Promise<SearchResults> {
  const q = cleanSearchQuery(query);
  if (q.length < 2) return { drivers: [], posts: [] };

  const [drivers, posts] = await Promise.all([
    supabase.from('profiles').select('id, username').ilike('username', `%${q}%`).limit(USER_LIMIT),
    supabase
      .from('posts')
      .select(POST_SELECT)
      .or(`car.ilike.%${q}%,caption.ilike.%${q}%`)
      .order('created_at', { ascending: false })
      .limit(POST_LIMIT),
  ]);
  if (drivers.error) throw drivers.error;
  if (posts.error) throw posts.error;

  return {
    drivers: drivers.data as Driver[],
    posts: (posts.data as unknown as PostRow[]).map(toPost),
  };
}
