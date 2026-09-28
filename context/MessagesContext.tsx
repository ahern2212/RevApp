import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { useAuth } from '@/context/AuthContext';
import { type Conversation, fetchConversations, isMissingMessaging } from '@/lib/messages';
import { supabase } from '@/lib/supabase';

type MessagesContextValue = {
  /** Your chats, most recent first; null until the first load. */
  conversations: Conversation[] | null;
  /** The direct-messages migration hasn't been run yet. */
  unavailable: boolean;
  unreadCount: number;
  refresh: () => Promise<void>;
  /** Clears a chat's unread dot right away (the server is told separately). */
  markReadLocally: (conversationId: string) => void;
};

const MessagesContext = createContext<MessagesContextValue | null>(null);

/** The inbox plus one realtime subscription that keeps it (and the unread badge) current. */
export function MessagesProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const userId = user?.id;
  const [loaded, setLoaded] = useState<{ userId: string; list: Conversation[] } | null>(null);
  const [unavailable, setUnavailable] = useState(false);
  const conversations = loaded && loaded.userId === userId ? loaded.list : null;

  const refresh = useCallback(async () => {
    if (!userId) return;
    try {
      const list = await fetchConversations(userId);
      setLoaded({ userId, list });
      setUnavailable(false);
    } catch (error) {
      if (isMissingMessaging(error)) setUnavailable(true);
      else console.warn('Failed to load messages', error);
    }
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    refresh();
    // RLS only delivers changes to chats you're in.
    const channel = supabase
      .channel(`conversations:${userId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'conversations' }, () => {
        refresh();
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, refresh]);

  const markReadLocally = useCallback(
    (conversationId: string) =>
      setLoaded((current) =>
        current
          ? {
              ...current,
              list: current.list.map((chat) => (chat.id === conversationId ? { ...chat, unread: false } : chat)),
            }
          : current
      ),
    []
  );

  const value = useMemo(
    () => ({
      conversations,
      unavailable,
      unreadCount: conversations?.filter((chat) => chat.unread).length ?? 0,
      refresh,
      markReadLocally,
    }),
    [conversations, unavailable, refresh, markReadLocally]
  );

  return <MessagesContext.Provider value={value}>{children}</MessagesContext.Provider>;
}

export function useMessages() {
  const ctx = useContext(MessagesContext);
  if (!ctx) throw new Error('useMessages must be used inside MessagesProvider');
  return ctx;
}
