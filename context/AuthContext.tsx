import { Session } from '@supabase/supabase-js';
import { createContext, PropsWithChildren, useContext, useEffect, useMemo, useState } from 'react';

import { unregisterPush } from '@/lib/push';
import { supabase } from '@/lib/supabase';
import type { User } from '@/types';

type AuthResult = { error: string | null; needsConfirmation?: boolean };

type AuthContextType = {
  session: Session | null;
  user: User | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<AuthResult>;
  signUp: (email: string, password: string, username: string) => Promise<AuthResult>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}

type Profile = { id: string; username: string };

// The profiles table holds the canonical handle (the DB may adjust it to keep it unique);
// fall back to sign-up metadata until the profile row has loaded.
function toUser(session: Session | null, profile: Profile | null): User | null {
  if (!session) return null;
  const { id, email, user_metadata } = session.user;
  if (profile?.id === id) return { id, username: profile.username };
  const username = (user_metadata?.username as string | undefined) ?? email?.split('@')[0] ?? 'driver';
  return { id, username };
}

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const userId = session?.user.id;

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    supabase
      .from('profiles')
      .select('id, username')
      .eq('id', userId)
      .maybeSingle()
      .then(({ data }) => {
        if (!cancelled && data) setProfile(data as Profile);
      });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  useEffect(() => {
    supabase.auth
      .getSession()
      .then(({ data: { session } }) => setSession(session))
      .finally(() => setIsLoading(false));

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  const value = useMemo<AuthContextType>(
    () => ({
      session,
      user: toUser(session, profile),
      isLoading,
      signIn: async (email, password) => {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        return { error: error?.message ?? null };
      },
      signUp: async (email, password, username) => {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { data: { username: username.trim().toLowerCase() } },
        });
        if (error) return { error: error.message };
        // With "Confirm email" enabled in Supabase, no session is returned until the link is clicked.
        return { error: null, needsConfirmation: !data.session };
      },
      signOut: async () => {
        // Stop pushes to this phone first; it needs the session to do so.
        await unregisterPush().catch((error) => console.warn('Push unregister failed', error));
        await supabase.auth.signOut();
      },
    }),
    [session, profile, isLoading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
