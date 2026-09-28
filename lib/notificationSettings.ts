import { supabase } from '@/lib/supabase';

export type PushKind = 'likes' | 'comments' | 'follows' | 'mentions' | 'messages';
export type NotificationSettings = Record<PushKind, boolean>;

export const PUSH_KINDS: { key: PushKind; label: string; detail: string }[] = [
  { key: 'messages', label: 'Messages', detail: 'New direct messages' },
  { key: 'comments', label: 'Comments', detail: 'Comments on your posts' },
  { key: 'mentions', label: 'Mentions', detail: 'When someone @mentions you' },
  { key: 'follows', label: 'New followers', detail: 'When someone follows you' },
  { key: 'likes', label: 'Likes', detail: 'Likes on your posts' },
];

export const ALL_ON: NotificationSettings = {
  likes: true,
  comments: true,
  follows: true,
  mentions: true,
  messages: true,
};

const MISSING_SCHEMA = new Set(['42P01', 'PGRST205']);

/** Your push settings (everything on until you change something), or null before the migration. */
export async function fetchNotificationSettings(): Promise<NotificationSettings | null> {
  const { data, error } = await supabase
    .from('notification_settings')
    .select('likes, comments, follows, mentions, messages')
    .maybeSingle();
  if (error) {
    if (error.code && MISSING_SCHEMA.has(error.code)) return null;
    throw error;
  }
  return data ? (data as NotificationSettings) : ALL_ON;
}

export async function saveNotificationSettings(userId: string, settings: NotificationSettings): Promise<void> {
  const { error } = await supabase
    .from('notification_settings')
    .upsert({ user_id: userId, ...settings, updated_at: new Date().toISOString() });
  if (error) throw error;
}
