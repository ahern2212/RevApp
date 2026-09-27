import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

import { supabase } from '@/lib/supabase';

const POLL_MS = 45_000;

/**
 * How many posts were created after the newest one currently in the feed. Polls while the
 * app is in the foreground; resets whenever the feed's newest post changes (refresh, new post).
 */
export function useNewPostsCount(newestCreatedAt: number | null): number {
  const [result, setResult] = useState<{ since: number; count: number } | null>(null);

  useEffect(() => {
    if (newestCreatedAt === null) return;
    let cancelled = false;
    // +1ms: timestamps here are millisecond-rounded, the database's are microseconds.
    const since = new Date(newestCreatedAt + 1).toISOString();

    const check = async () => {
      if (AppState.currentState !== 'active') return;
      const { count, error } = await supabase
        .from('posts')
        .select('id', { count: 'exact', head: true })
        .gt('created_at', since);
      if (!cancelled && !error) setResult({ since: newestCreatedAt, count: count ?? 0 });
    };

    const timer = setInterval(check, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [newestCreatedAt]);

  return result && result.since === newestCreatedAt ? result.count : 0;
}
