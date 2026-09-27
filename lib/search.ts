import { type PostRow, toPost, withPostSelect } from '@/lib/posts';
import { supabase } from '@/lib/supabase';
import type { Post } from '@/types';

const USER_LIMIT = 8;
const POST_LIMIT = 30;

export type Driver = { id: string; username: string };
export type SearchResults = { drivers: Driver[]; posts: Post[] };

// Keep only characters that are safe inside a PostgREST filter string
// (commas, parentheses and wildcards would change the query's meaning). "#" is kept so
// tapping a hashtag searches for that exact tag.
export function cleanSearchQuery(query: string): string {
  return query.replace(/[^\p{L}\p{N}\s#._-]/gu, ' ').replace(/\s+/g, ' ').trim();
}

/** Drivers whose username matches, and posts whose car or caption matches. */
export async function search(query: string): Promise<SearchResults> {
  const q = cleanSearchQuery(query);
  if (q.length < 2) return { drivers: [], posts: [] };

  const [drivers, posts] = await Promise.all([
    supabase.from('profiles').select('id, username').ilike('username', `%${q}%`).limit(USER_LIMIT),
    withPostSelect((select) =>
      supabase
        .from('posts')
        .select(select)
        .or(`car.ilike.%${q}%,caption.ilike.%${q}%`)
        .order('created_at', { ascending: false })
        .limit(POST_LIMIT)
    ),
  ]);
  if (drivers.error) throw drivers.error;
  if (posts.error) throw posts.error;

  return {
    drivers: drivers.data as Driver[],
    posts: (posts.data as unknown as PostRow[]).map(toPost),
  };
}
