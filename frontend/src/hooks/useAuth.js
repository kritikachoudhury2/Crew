import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext({
  session: null,
  user: null,
  profile: null,
  loading: true,
  refreshProfile: async () => {},
  signOut: async () => {},
});

// Creates a minimal profile row if none exists yet.
async function ensureProfile(uid, email) {
  if (!uid) return null;

  const { data: existing, error: fetchErr } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', uid)
    .single();

  if (fetchErr && fetchErr.code !== 'PGRST116') {
    console.error('[useAuth] fetchProfile error:', fetchErr.message);
    return null;
  }

  if (existing) return existing;

  const { data: created, error: insertErr } = await supabase
    .from('profiles')
    .upsert(
      { id: uid, email: email || null, last_active: new Date().toISOString() },
      { onConflict: 'id' }
    )
    .select()
    .single();

  if (insertErr) {
    if (insertErr.code === '23505') {
      const { data: retry } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', uid)
        .single();
      return retry || null;
    }
    console.error('[useAuth] ensureProfile insert error:', insertErr.message);
    return null;
  }

  return created || null;
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async (uid) => {
    if (!uid) return null;
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', uid)
      .single();
    if (error && error.code !== 'PGRST116') {
      console.error('[useAuth] fetchProfile error:', error.message);
    }
    return data || null;
  }, []);

  const refreshProfile = useCallback(async () => {
    const uid = session?.user?.id || user?.id;
    if (!uid) return;
    const p = await fetchProfile(uid);
    setProfile(p);
  }, [session, user, fetchProfile]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setSession(null);
    setUser(null);
    setProfile(null);
  }, []);

  useEffect(() => {
    let mounted = true;

    // getSession() hydrates immediately on page load
    // Works correctly with implicit flow — no lock conflict
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!mounted) return;
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        const p = await ensureProfile(session.user.id, session.user.email);
        if (mounted) setProfile(p);
      }
      if (mounted) setLoading(false);
    });

    // onAuthStateChange handles future events only
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      if (!mounted) return;
      // Skip INITIAL_SESSION — already handled by getSession() above
      if (event === 'INITIAL_SESSION') return;
      setSession(newSession);
      setUser(newSession?.user ?? null);
      if (newSession?.user) {
        const p = await ensureProfile(
          newSession.user.id,
          newSession.user.email
        );
        if (mounted) setProfile(p);
      } else {
        if (mounted) setProfile(null);
      }
      if (mounted) setLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  return (
    <AuthContext.Provider
      value={{ session, user, profile, loading, refreshProfile, signOut }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
