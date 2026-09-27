import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import { fetchProfiles, type Profile } from '@/lib/profiles';

type ProfilesContextValue = {
  profiles: Record<string, Profile>;
  request: (userId: string) => void;
  /** Replace a cached profile (e.g. after the user edits their own). */
  setProfile: (profile: Profile) => void;
};

const ProfilesContext = createContext<ProfilesContextValue | null>(null);

/**
 * Cache of user profiles (bio, picture). Components ask for ids as they render; requests
 * made in the same tick are batched into one query. Kept separate from the feed query so
 * profile data can never break the feed.
 */
export function ProfilesProvider({ children }: { children: ReactNode }) {
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const requested = useRef(new Set<string>());
  const queue = useRef(new Set<string>());
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flush = useCallback(() => {
    timer.current = null;
    const ids = [...queue.current];
    queue.current.clear();
    fetchProfiles(ids)
      .then((list) =>
        setProfiles((current) => {
          const next = { ...current };
          for (const profile of list) next[profile.id] = profile;
          return next;
        })
      )
      .catch((error) => {
        console.warn('Failed to load profiles', error);
        for (const id of ids) requested.current.delete(id); // allow a retry later
      });
  }, []);

  const request = useCallback(
    (userId: string) => {
      if (requested.current.has(userId)) return;
      requested.current.add(userId);
      queue.current.add(userId);
      timer.current ??= setTimeout(flush, 0);
    },
    [flush]
  );

  const setProfile = useCallback((profile: Profile) => {
    requested.current.add(profile.id);
    setProfiles((current) => ({ ...current, [profile.id]: profile }));
  }, []);

  const value = useMemo(() => ({ profiles, request, setProfile }), [profiles, request, setProfile]);
  return <ProfilesContext.Provider value={value}>{children}</ProfilesContext.Provider>;
}

export function useProfiles() {
  const ctx = useContext(ProfilesContext);
  if (!ctx) throw new Error('useProfiles must be used inside ProfilesProvider');
  return ctx;
}

/** The cached profile for a user, fetching it on first use. */
export function useProfile(userId: string | undefined): Profile | undefined {
  const { profiles, request } = useProfiles();
  useEffect(() => {
    if (userId) request(userId);
  }, [userId, request]);
  return userId ? profiles[userId] : undefined;
}
