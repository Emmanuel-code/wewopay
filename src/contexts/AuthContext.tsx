import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/db/supabase';
import { Profile, UserRole } from '@/types/types';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  role: UserRole | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// How long the app waits for the stored session (and the profile row) before
// it stops blocking on them. Previously `loading` was only cleared inside the
// onAuthStateChange callback, so a poisoned stored session — e.g. one left
// behind by the old navigator-lock fights — could stall the initial restore
// forever, and RouteGuard then showed its spinner on every page, public ones
// included. These timeouts guarantee the app always reaches a usable screen:
// the login screen when no session resolves (a fresh sign-in overwrites the
// bad stored token), the dashboard when one does.
const INITIAL_AUTH_TIMEOUT_MS = 8000;
const PROFILE_TIMEOUT_MS = 5000;

// Race a promise against a timer; resolves null on timeout instead of
// hanging forever. The underlying work keeps running — a late session still
// arrives through onAuthStateChange and updates state normally.
const withTimeout = <T,>(promise: Promise<T>, ms: number): Promise<T | null> =>
  Promise.race([
    promise,
    new Promise<null>((resolve) => setTimeout(() => resolve(null), ms)),
  ]);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        console.error('Error fetching profile:', error);
      } else if (data) {
        setProfile(data as Profile);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    let isMounted = true;

    // Apply a resolved session (or lack of one) to state. The profile fetch
    // never holds the loading gate: it is raced against a timeout, so a
    // stalled profiles query can't spin the app forever either.
    const applySession = async (currentSession: Session | null) => {
      if (!isMounted) return;
      setSession(currentSession);
      setUser(currentSession?.user ?? null);
      if (currentSession?.user) {
        await withTimeout(fetchProfile(currentSession.user.id), PROFILE_TIMEOUT_MS);
      } else {
        setProfile(null);
      }
      if (!isMounted) return;
      setLoading(false);
    };

    // Resolve the initial session explicitly instead of relying only on the
    // listener's INITIAL_SESSION event: with a poisoned stored token that
    // event may never arrive. The timeout means a stalled restore falls
    // through to the login screen instead of spinning forever.
    const resolveInitialSession = async () => {
      const result = await withTimeout(supabase.auth.getSession(), INITIAL_AUTH_TIMEOUT_MS);
      if (!isMounted) return;
      await applySession(result?.data?.session ?? null);
    };

    resolveInitialSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, currentSession) => {
      await applySession(currentSession);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    // Never let sign-out hang the UI: the old code awaited the server-side
    // revoke unconditionally, so a stalled session left the Sign out button
    // doing visibly nothing (navigation below it never ran). Race the
    // revoke against a short timeout, then clear local state regardless —
    // a failed server revoke must not trap the user in a signed-in UI.
    try {
      await Promise.race([
        supabase.auth.signOut(),
        new Promise((resolve) => setTimeout(resolve, 3000)),
      ]);
    } catch {
      // Ignore: local state clears below regardless.
    }
    setUser(null);
    setSession(null);
    setProfile(null);
  };

  const refreshProfile = async () => {
    if (user?.id) {
      await fetchProfile(user.id);
    }
  };

  const role: UserRole | null = profile?.role ?? (user ? 'developer' : null);
  const isAdmin = role === 'admin';

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        role,
        loading,
        signOut,
        refreshProfile,
        isAdmin,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
