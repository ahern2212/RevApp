import AsyncStorage from '@react-native-async-storage/async-storage';

import { BUCKET } from '@/lib/posts';
import { supabase } from '@/lib/supabase';

const ACTIVITY_LIMIT = 50;
const PREVIEW_LENGTH = 60;

const ACTIVITY_SELECT =
  'id, type, post_id, actor_id, created_at, actor:profiles!notifications_actor_id_fkey(username), comment:comments!notifications_comment_id_fkey(body), post:posts!notifications_post_id_fkey(image_path)';

type ActivityRow = {
  id: string;
  type: ActivityType;
  post_id: string | null;
  actor_id: string;
  created_at: string;
  actor: { username: string } | null;
  comment: { body: string } | null;
  post: { image_path: string } | null;
};

export type ActivityType = 'like' | 'comment' | 'follow' | 'mention';

export type Activity = {
  id: string;
  type: ActivityType;
  /** null for follows. */
  postId: string | null;
  actorId: string;
  actorName: string;
  commentBody: string | null;
  postImageUri: string | null;
  createdAt: number;
};

function toActivity(row: ActivityRow): Activity {
  return {
    id: row.id,
    type: row.type,
    postId: row.post_id,
    actorId: row.actor_id,
    actorName: row.actor?.username ?? 'Someone',
    commentBody: row.comment?.body ?? null,
    postImageUri: row.post
      ? supabase.storage.from(BUCKET).getPublicUrl(row.post.image_path).data.publicUrl
      : null,
    createdAt: Date.parse(row.created_at),
  };
}

/** "maya liked your post" / "kai commented: "clean build"" / "jo started following you" */
export function describeActivity(activity: Activity): string {
  if (activity.type === 'like') return `${activity.actorName} liked your post`;
  if (activity.type === 'follow') return `${activity.actorName} started following you`;
  const body = activity.commentBody ?? '';
  const preview = body.length > PREVIEW_LENGTH ? `${body.slice(0, PREVIEW_LENGTH)}…` : body;
  if (activity.type === 'mention') {
    return preview
      ? `${activity.actorName} mentioned you: "${preview}"`
      : `${activity.actorName} mentioned you in a post`;
  }
  return preview
    ? `${activity.actorName} commented: "${preview}"`
    : `${activity.actorName} commented on your post`;
}

/** Recent likes and comments on the signed-in user's posts (RLS limits rows to theirs). */
export async function fetchActivity(): Promise<Activity[]> {
  const { data, error } = await supabase
    .from('notifications')
    .select(ACTIVITY_SELECT)
    .order('created_at', { ascending: false })
    .limit(ACTIVITY_LIMIT);
  if (error) throw error;
  return (data as unknown as ActivityRow[]).map(toActivity);
}

export async function fetchActivityById(id: string): Promise<Activity | null> {
  const { data, error } = await supabase
    .from('notifications')
    .select(ACTIVITY_SELECT)
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data ? toActivity(data as unknown as ActivityRow) : null;
}

/** How many notifications arrived after `since` (all of them if never opened). */
export async function countActivitySince(since: string | null): Promise<number> {
  let query = supabase.from('notifications').select('id', { count: 'exact', head: true });
  if (since) query = query.gt('created_at', since);
  const { count, error } = await query;
  if (error) throw error;
  return count ?? 0;
}

// "Last opened Activity" lives on the device; unread counts don't need to sync across phones.
const seenKey = (userId: string) => `garage.activitySeenAt:${userId}`;

export async function getActivitySeenAt(userId: string): Promise<string | null> {
  return AsyncStorage.getItem(seenKey(userId));
}

export async function setActivitySeenAt(userId: string, at: string): Promise<void> {
  await AsyncStorage.setItem(seenKey(userId), at);
}
