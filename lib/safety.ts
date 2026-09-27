import { supabase } from '@/lib/supabase';

// Must match the check constraint in supabase/migrations/20260928010000_reports_and_blocks.sql.
export const REPORT_REASONS = [
  'Spam',
  'Nudity or sexual content',
  'Harassment or hate',
  'Violence or dangerous driving',
  'Scam or fraud',
  'Not car related',
  'Something else',
] as const;
export type ReportReason = (typeof REPORT_REASONS)[number];

export type ReportTarget =
  | { kind: 'post'; id: string }
  | { kind: 'comment'; id: string }
  | { kind: 'listing'; id: string }
  | { kind: 'thread'; id: string }
  | { kind: 'reply'; id: string };

const TARGET_COLUMNS: Record<ReportTarget['kind'], string> = {
  post: 'post_id',
  comment: 'comment_id',
  listing: 'listing_id',
  thread: 'thread_id',
  reply: 'reply_id',
};

export const TARGET_LABELS: Record<ReportTarget['kind'], string> = {
  post: 'post',
  comment: 'comment',
  listing: 'listing',
  thread: 'thread',
  reply: 'reply',
};

// Missing table / column: the report-and-block migration hasn't been run yet.
const MISSING_SCHEMA = new Set(['42P01', '42703', 'PGRST204', 'PGRST205']);

function readable(error: { code?: string; message: string }): Error {
  if (error.code && MISSING_SCHEMA.has(error.code)) {
    return new Error('Reporting and blocking need the latest database update.');
  }
  return error instanceof Error ? error : new Error(error.message);
}

/** Reports something. Reporting the same thing twice is fine (the second is ignored). */
export async function report(target: ReportTarget, reason: ReportReason): Promise<void> {
  const { error } = await supabase
    .from('reports')
    .insert({ [TARGET_COLUMNS[target.kind]]: target.id, reason });
  if (error && error.code !== '23505') throw readable(error);
}

export async function blockUser(userId: string): Promise<void> {
  const { error } = await supabase.from('blocks').insert({ blocked_id: userId });
  if (error && error.code !== '23505') throw readable(error);
}

export async function unblockUser(userId: string): Promise<void> {
  const { error } = await supabase.from('blocks').delete().eq('blocked_id', userId);
  if (error) throw readable(error);
}

/** Whether the signed-in user has blocked this person (RLS limits rows to your own blocks). */
export async function hasBlocked(userId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('blocks')
    .select('blocked_id')
    .eq('blocked_id', userId)
    .maybeSingle();
  if (error) {
    if (error.code && MISSING_SCHEMA.has(error.code)) return false;
    throw error;
  }
  return !!data;
}

export type BlockedUser = { id: string; username: string };

export async function fetchBlocked(): Promise<BlockedUser[]> {
  const { data, error } = await supabase
    .from('blocks')
    .select('blocked_id, blocked:profiles!blocks_blocked_id_fkey(username)')
    .order('created_at', { ascending: false });
  if (error) throw readable(error);
  return (data as unknown as { blocked_id: string; blocked: { username: string } | null }[]).map((row) => ({
    id: row.blocked_id,
    username: row.blocked?.username ?? 'driver',
  }));
}
