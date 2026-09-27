import { cleanSearchQuery } from '@/lib/search';
import { supabase } from '@/lib/supabase';

// Must match the check constraint in supabase/migrations/20260927100000_forums.sql.
export const FORUM_CATEGORIES = ['General', 'Builds', 'Tech Help', 'Meets', 'Off-Topic'] as const;
export type ForumCategory = (typeof FORUM_CATEGORIES)[number];

export const THREAD_TITLE_MAX = 120;
export const THREAD_BODY_MAX = 5000;
export const REPLY_MAX = 2000;
const THREAD_LIMIT = 50;

const THREAD_SELECT =
  'id, author_id, category, title, body, created_at, last_activity_at, author:profiles!forum_threads_author_id_fkey(username), replies:forum_replies(count)';
const REPLY_SELECT =
  'id, author_id, body, created_at, author:profiles!forum_replies_author_id_fkey(username)';

type ThreadRow = {
  id: string;
  author_id: string;
  category: ForumCategory;
  title: string;
  body: string;
  created_at: string;
  last_activity_at: string;
  author: { username: string } | null;
  replies: { count: number }[];
};

type ReplyRow = {
  id: string;
  author_id: string;
  body: string;
  created_at: string;
  author: { username: string } | null;
};

export type ForumThread = {
  id: string;
  authorId: string;
  authorName: string;
  category: ForumCategory;
  title: string;
  body: string;
  createdAt: number;
  lastActivityAt: number;
  replyCount: number;
};

export type ForumReply = {
  id: string;
  authorId: string;
  authorName: string;
  body: string;
  createdAt: number;
};

function toThread(row: ThreadRow): ForumThread {
  return {
    id: row.id,
    authorId: row.author_id,
    authorName: row.author?.username ?? 'driver',
    category: row.category,
    title: row.title,
    body: row.body,
    createdAt: Date.parse(row.created_at),
    lastActivityAt: Date.parse(row.last_activity_at),
    replyCount: row.replies[0]?.count ?? 0,
  };
}

function toReply(row: ReplyRow): ForumReply {
  return {
    id: row.id,
    authorId: row.author_id,
    authorName: row.author?.username ?? 'driver',
    body: row.body,
    createdAt: Date.parse(row.created_at),
  };
}

export const THREAD_SORTS = ['active', 'new', 'top', 'unanswered'] as const;
export type ThreadSort = (typeof THREAD_SORTS)[number];
export const SORT_LABELS: Record<ThreadSort, string> = {
  active: 'Active',
  new: 'New',
  top: 'Top',
  unanswered: 'Unanswered',
};

export type ThreadFilters = {
  category: ForumCategory | null;
  sort: ThreadSort;
  search: string;
  /** Only threads started by this user. */
  authorId: string | null;
};

/** Threads matching the filters (category, text search, author) in the chosen order. */
export async function fetchThreads(filters: ThreadFilters): Promise<ForumThread[]> {
  let query = supabase.from('forum_threads').select(THREAD_SELECT).limit(THREAD_LIMIT);
  if (filters.category) query = query.eq('category', filters.category);
  if (filters.authorId) query = query.eq('author_id', filters.authorId);

  const q = cleanSearchQuery(filters.search);
  if (q.length >= 2) query = query.or(`title.ilike.%${q}%,body.ilike.%${q}%`);

  switch (filters.sort) {
    case 'new':
      query = query.order('created_at', { ascending: false });
      break;
    case 'top':
      // reply_count comes from the forum-sorting migration.
      query = query
        .order('reply_count', { ascending: false })
        .order('last_activity_at', { ascending: false });
      break;
    case 'unanswered':
      query = query.eq('reply_count', 0).order('created_at', { ascending: false });
      break;
    default:
      query = query.order('last_activity_at', { ascending: false });
  }

  const { data, error } = await query;
  if (error?.code === '42703') {
    throw new Error('Top and Unanswered need the latest database update (run the SQL migration).');
  }
  if (error) throw error;
  return (data as unknown as ThreadRow[]).map(toThread);
}

export async function fetchThread(
  threadId: string
): Promise<{ thread: ForumThread; replies: ForumReply[] } | null> {
  const [thread, replies] = await Promise.all([
    supabase.from('forum_threads').select(THREAD_SELECT).eq('id', threadId).maybeSingle(),
    supabase
      .from('forum_replies')
      .select(REPLY_SELECT)
      .eq('thread_id', threadId)
      .order('created_at', { ascending: true }),
  ]);
  if (thread.error) throw thread.error;
  if (replies.error) throw replies.error;
  if (!thread.data) return null;
  return {
    thread: toThread(thread.data as unknown as ThreadRow),
    replies: (replies.data as unknown as ReplyRow[]).map(toReply),
  };
}

export async function createThread(input: {
  category: ForumCategory;
  title: string;
  body: string;
}): Promise<ForumThread> {
  const { data, error } = await supabase
    .from('forum_threads')
    .insert({ category: input.category, title: input.title.trim(), body: input.body.trim() })
    .select(THREAD_SELECT)
    .single();
  if (error) throw error;
  return toThread(data as unknown as ThreadRow);
}

export async function deleteThread(threadId: string): Promise<void> {
  const { data, error } = await supabase.from('forum_threads').delete().eq('id', threadId).select('id');
  if (error) throw error;
  if (!data?.length) throw new Error('Only the author can delete this thread.');
}

export async function addReply(threadId: string, body: string): Promise<ForumReply> {
  const { data, error } = await supabase
    .from('forum_replies')
    .insert({ thread_id: threadId, body: body.trim() })
    .select(REPLY_SELECT)
    .single();
  if (error) throw error;
  return toReply(data as unknown as ReplyRow);
}

export async function deleteReply(replyId: string): Promise<void> {
  const { error } = await supabase.from('forum_replies').delete().eq('id', replyId);
  if (error) throw error;
}

/** Icon for each category (Ionicons names). */
export const CATEGORY_ICONS: Record<ForumCategory, 'chatbubbles-outline' | 'construct-outline' | 'build-outline' | 'people-outline' | 'cafe-outline'> = {
  General: 'chatbubbles-outline',
  Builds: 'construct-outline',
  'Tech Help': 'build-outline',
  Meets: 'people-outline',
  'Off-Topic': 'cafe-outline',
};
