import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const user = session?.user ?? null;

  // ── Single effect, empty deps, mounted guard ──
  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data: { session: s } }) => {
      if (!mounted) return;
      setSession(s);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, s) => {
        if (!mounted) return;
        setSession(s);
        setLoading(false);
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // ── Fetch profile whenever session.user changes ──
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
    if (user?.id) {
      fetchProfile(user.id);
    } else {
      setProfile(null);
    }
  }, [user?.id, fetchProfile]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    window.location.href = '/';
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
