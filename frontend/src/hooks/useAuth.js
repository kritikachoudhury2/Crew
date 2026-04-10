import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const initCalled = useRef(false);

  const fetchProfile = useCallback(async (userId) => {
    if (!userId) { setProfile(null); return null; }
    try {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      setProfile(data);
      return data;
    } catch {
      setProfile(null);
      return null;
    }
  }, []);

  useEffect(() => {
    // ──────────────────────────────────────────────────────────────
    // THIS IS THE ONLY getSession() CALL IN THE ENTIRE APP.
    // No other file may call supabase.auth.getSession().
    // All other components read auth state from this context.
    // ──────────────────────────────────────────────────────────────

    // 1. Subscribe to auth changes FIRST (so we never miss events
    //    that fire between getSession and subscription setup).
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        if (event === 'SIGNED_OUT') {
          setSession(null);
          setUser(null);
          setProfile(null);
          setLoading(false);
          return;
        }
        if (newSession?.user) {
          setSession(newSession);
          setUser(newSession.user);
          await fetchProfile(newSession.user.id);
        } else {
          setSession(null);
          setUser(null);
          setProfile(null);
        }
        setLoading(false);
      }
    );

    // 2. One-time getSession to hydrate from persisted storage.
    //    Guard with ref so React 18 StrictMode double-mount is safe.
    if (!initCalled.current) {
      initCalled.current = true;
      supabase.auth.getSession().then(async ({ data: { session: s } }) => {
        if (s?.user) {
          setSession(s);
          setUser(s.user);
          await fetchProfile(s.user.id);
        }
        setLoading(false);
      }).catch(() => {
        setLoading(false);
      });
    }

    return () => subscription?.unsubscribe();
  }, [fetchProfile]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setSession(null);
    setUser(null);
    setProfile(null);
  }, []);

  const refreshProfile = useCallback(async () => {
    if (user) return fetchProfile(user.id);
    return null;
  }, [user, fetchProfile]);

  return (
    <AuthContext.Provider value={{ session, user, profile, loading, signOut, refreshProfile, fetchProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
