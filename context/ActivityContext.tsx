import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { useAuth } from '@/context/AuthContext';
import {
  type Activity,
  countActivitySince,
  fetchActivityById,
  getActivitySeenAt,
  setActivitySeenAt,
} from '@/lib/activity';
import { supabase } from '@/lib/supabase';

type ActivityContextValue = {
  /** Notifications that arrived since the user last opened the Activity screen. */
  unread: number;
  /** Most recent notification received live (drives the pop-up banner). */
  latest: Activity | null;
  markAllSeen: () => void;
};

const ActivityContext = createContext<ActivityContextValue | null>(null);

/** One realtime subscription for the signed-in user's notifications, shared by the
 * unread badge and the pop-up banner. */
export function ActivityProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const userId = user?.id;
  const [unread, setUnread] = useState<{ userId: string; count: number } | null>(null);
  const [latest, setLatest] = useState<Activity | null>(null);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;

    getActivitySeenAt(userId)
      .then(countActivitySince)
      .then((count) => !cancelled && setUnread({ userId, count }))
      .catch((error) => console.warn('Failed to count activity', error));

    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `recipient_id=eq.${userId}`,
        },
        async (payload) => {
          // The realtime payload has ids only; fetch names, comment text and the photo.
          const activity = await fetchActivityById((payload.new as { id: string }).id).catch(
            () => null
          );
          if (cancelled || !activity) return;
          setLatest(activity);
          setUnread((current) => ({
            userId,
            count: (current?.userId === userId ? current.count : 0) + 1,
          }));
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const markAllSeen = useCallback(() => {
    if (!userId) return;
    setUnread({ userId, count: 0 });
    setActivitySeenAt(userId, new Date().toISOString()).catch((error) =>
      console.warn('Failed to save activity seen time', error)
    );
  }, [userId]);

  const value = useMemo(
    () => ({
      unread: unread && unread.userId === userId ? unread.count : 0,
      latest,
      markAllSeen,
    }),
    [unread, userId, latest, markAllSeen]
  );

  return <ActivityContext.Provider value={value}>{children}</ActivityContext.Provider>;
}

export function useActivity() {
  const ctx = useContext(ActivityContext);
  if (!ctx) throw new Error('useActivity must be used inside ActivityProvider');
  return ctx;
}
