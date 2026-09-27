import { isUnread } from '@/lib/chat';
import { supabase } from '@/lib/supabase';

export const MESSAGE_MAX = 1000;
const PAGE_SIZE = 40;

// Missing table / function: the direct-messages migration hasn't been run yet.
const MISSING_SCHEMA = new Set(['42P01', '42883', 'PGRST202', 'PGRST205']);

export function isMissingMessaging(error: unknown): boolean {
  const code = (error as { code?: string } | null)?.code;
  return !!code && MISSING_SCHEMA.has(code);
}

function readable(error: { code?: string; message: string }): Error {
  if (isMissingMessaging(error)) return new Error('Messages need the latest database update.');
  return error instanceof Error ? error : new Error(error.message);
}

const toTime = (value: string | null) => (value ? Date.parse(value) : null);

// ─── Conversations ─────────────────────────────────────────────────────────

export type Conversation = {
  id: string;
  partnerId: string;
  partnerName: string;
  lastMessage: string;
  lastMessageAt: number | null;
  lastSenderId: string | null;
  unread: boolean;
};

type ConversationRow = {
  id: string;
  user_a: string;
  user_b: string;
  last_message: string;
  last_message_at: string | null;
  last_sender_id: string | null;
  user_a_read_at: string | null;
  user_b_read_at: string | null;
  a: { username: string } | null;
  b: { username: string } | null;
};

const CONVERSATION_SELECT =
  '*, a:profiles!conversations_user_a_fkey(username), b:profiles!conversations_user_b_fkey(username)';

function toConversation(row: ConversationRow, myId: string): Conversation {
  const iAmA = row.user_a === myId;
  const partner = iAmA ? row.b : row.a;
  const lastMessageAt = toTime(row.last_message_at);
  return {
    id: row.id,
    partnerId: iAmA ? row.user_b : row.user_a,
    partnerName: partner?.username ?? 'driver',
    lastMessage: row.last_message,
    lastMessageAt,
    lastSenderId: row.last_sender_id,
    unread: isUnread(
      {
        lastMessageAt,
        lastSenderId: row.last_sender_id,
        myReadAt: toTime(iAmA ? row.user_a_read_at : row.user_b_read_at),
      },
      myId
    ),
  };
}

/** Chats that have at least one message, most recent first (RLS limits rows to yours). */
export async function fetchConversations(myId: string): Promise<Conversation[]> {
  const { data, error } = await supabase
    .from('conversations')
    .select(CONVERSATION_SELECT)
    .not('last_message_at', 'is', null)
    .order('last_message_at', { ascending: false })
    .limit(100);
  if (error) throw readable(error);
  return (data as unknown as ConversationRow[]).map((row) => toConversation(row, myId));
}

export async function fetchConversation(id: string, myId: string): Promise<Conversation | null> {
  const { data, error } = await supabase
    .from('conversations')
    .select(CONVERSATION_SELECT)
    .eq('id', id)
    .maybeSingle();
  if (error) throw readable(error);
  return data ? toConversation(data as unknown as ConversationRow, myId) : null;
}

/** Opens (creating if needed) your chat with another driver and returns its id. */
export async function startConversation(otherId: string): Promise<string> {
  const { data, error } = await supabase.rpc('start_conversation', { other: otherId });
  if (error) throw readable(error);
  return data as string;
}

export async function markConversationRead(id: string): Promise<void> {
  const { error } = await supabase.rpc('mark_conversation_read', { conv: id });
  if (error) throw readable(error);
}

// ─── Messages ──────────────────────────────────────────────────────────────

export type Message = {
  id: string;
  senderId: string;
  body: string;
  /** A post shared in the chat (null for plain text, or once the post is deleted). */
  postId: string | null;
  createdAt: number;
};

type MessageRow = { id: string; sender_id: string; body: string; post_id?: string | null; created_at: string };

// "*" picks up post_id once the share-posts migration has run.
const MESSAGE_SELECT = '*';

const toMessage = (row: MessageRow): Message => ({
  id: row.id,
  senderId: row.sender_id,
  body: row.body,
  postId: row.post_id ?? null,
  createdAt: Date.parse(row.created_at),
});

export type MessagePage = { messages: Message[]; cursor: string | null; hasMore: boolean };

/** Newest messages first (for an inverted list). Pass the cursor to load older ones. */
export async function fetchMessages(conversationId: string, cursor?: string | null): Promise<MessagePage> {
  let query = supabase
    .from('messages')
    .select(MESSAGE_SELECT)
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: false })
    .limit(PAGE_SIZE);
  if (cursor) query = query.lt('created_at', cursor);
  const { data, error } = await query;
  if (error) throw readable(error);
  const rows = data as MessageRow[];
  return {
    messages: rows.map(toMessage),
    cursor: rows.at(-1)?.created_at ?? cursor ?? null,
    hasMore: rows.length === PAGE_SIZE,
  };
}

/** Sends text, or shares a post (with optional text) when `postId` is given. */
export async function sendMessage(conversationId: string, body: string, postId?: string): Promise<Message> {
  const row = { conversation_id: conversationId, body: body.trim(), ...(postId ? { post_id: postId } : {}) };
  const { data, error } = await supabase.from('messages').insert(row).select(MESSAGE_SELECT).single();
  if (error?.code === 'PGRST204' && postId) {
    throw new Error('Sending posts in messages needs the latest database update.');
  }
  if (error) {
    // The insert rule fails when either person has blocked the other.
    if (error.code === '42501') throw new Error('You can’t message this driver.');
    throw readable(error);
  }
  return toMessage(data as MessageRow);
}

export async function unsendMessage(id: string): Promise<void> {
  const { data, error } = await supabase.from('messages').delete().eq('id', id).select('id');
  if (error) throw readable(error);
  if (!data?.length) throw new Error('Only the sender can unsend a message.');
}

/**
 * Live new messages in one chat. Returns an unsubscribe function. (Realtime can't filter
 * deletes, so an unsent message disappears for the other person on their next load.)
 */
export function subscribeToMessages(conversationId: string, onInsert: (message: Message) => void): () => void {
  const channel = supabase
    .channel(`messages:${conversationId}`)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` },
      (payload) => onInsert(toMessage(payload.new as MessageRow))
    )
    .subscribe();
  return () => {
    supabase.removeChannel(channel);
  };
}
