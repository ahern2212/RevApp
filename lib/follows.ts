import { supabase } from '@/lib/supabase';

// Missing table / function: the follows migration hasn't been run yet.
const MISSING_SCHEMA = new Set(['42P01', '42883', 'PGRST202', 'PGRST205']);

export function isMissingFollows(error: unknown): boolean {
  const code = (error as { code?: string } | null)?.code;
  return !!code && MISSING_SCHEMA.has(code);
}

function readable(error: { code?: string; message: string }): Error {
  if (isMissingFollows(error)) return new Error('Following needs the latest database update.');
  return error instanceof Error ? error : new Error(error.message);
}

export type FollowCounts = { followers: number; following: number };

/** Follower and following counts, or null before the follows migration. */
export async function fetchFollowCounts(userId: string): Promise<FollowCounts | null> {
  const [followers, following] = await Promise.all([
    supabase.from('follows').select('follower_id', { count: 'exact', head: true }).eq('followee_id', userId),
    supabase.from('follows').select('followee_id', { count: 'exact', head: true }).eq('follower_id', userId),
  ]);
  const error = followers.error ?? following.error;
  if (error) {
    if (isMissingFollows(error)) return null;
    throw error;
  }
  return { followers: followers.count ?? 0, following: following.count ?? 0 };
}

export async function isFollowing(myId: string, userId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('follows')
    .select('followee_id')
    .eq('follower_id', myId)
    .eq('followee_id', userId)
    .maybeSingle();
  if (error) {
    if (isMissingFollows(error)) return false;
    throw error;
  }
  return !!data;
}

export async function follow(userId: string): Promise<void> {
  const { error } = await supabase.from('follows').insert({ followee_id: userId });
  if (error && error.code !== '23505') throw readable(error);
}

export async function unfollow(myId: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from('follows')
    .delete()
    .eq('follower_id', myId)
    .eq('followee_id', userId);
  if (error) throw readable(error);
}

export type FollowPerson = { id: string; username: string };
export type FollowList = 'followers' | 'following';

const LIST_LIMIT = 500;

/** People who follow `userId`, or people `userId` follows, newest first. */
export async function fetchFollowList(userId: string, list: FollowList): Promise<FollowPerson[]> {
  const query =
    list === 'followers'
      ? supabase
          .from('follows')
          .select('id:follower_id, person:profiles!follows_follower_id_fkey(username)')
          .eq('followee_id', userId)
      : supabase
          .from('follows')
          .select('id:followee_id, person:profiles!follows_followee_id_fkey(username)')
          .eq('follower_id', userId);
  const { data, error } = await query.order('created_at', { ascending: false }).limit(LIST_LIMIT);
  if (error) throw readable(error);
  return (data as unknown as { id: string; person: { username: string } | null }[]).map((row) => ({
    id: row.id,
    username: row.person?.username ?? 'driver',
  }));
}
