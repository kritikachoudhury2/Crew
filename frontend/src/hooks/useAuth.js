import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
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
// Called right after a confirmed session is established.
async function ensureProfile(uid, email) {
  if (!uid) return null;

  // First try to fetch
  const { data: existing, error: fetchErr } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', uid)
    .single();

  // PGRST116 = "no rows returned" — profile doesn't exist yet, create it
  if (fetchErr && fetchErr.code !== 'PGRST116') {
    console.error('[useAuth] fetchProfile error:', fetchErr.message);
    return null;
  }

  if (existing) return existing;

  // Profile doesn't exist — insert a skeleton so RLS / FK constraints are satisfied
  const { data: created, error: insertErr } = await supabase
    .from('profiles')
    .upsert(
      {
        id: uid,
        email: email || null,
        last_active: new Date().toISOString(),
      },
      { onConflict: 'id' }
    )
    .select()
    .single();

  if (insertErr) {
    // Row may already exist from a concurrent insert — fetch again
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
  // Prevent double-loading: track whether initial getSession has resolved
  const initialised = useRef(false);

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

    // ── Step 1: hydrate from existing session ───────────────────────────────
    supabase.auth.getSession().then(async ({ data: { session: initialSession } }) => {
      if (!mounted) return;

      setSession(initialSession);
      setUser(initialSession?.user ?? null);

      if (initialSession?.user) {
        const p = await ensureProfile(
          initialSession.user.id,
          initialSession.user.email
        );
        if (mounted) setProfile(p);
      }

      initialised.current = true;
      if (mounted) setLoading(false);
    });

    // ── Step 2: listen for future auth events ───────────────────────────────
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      if (!mounted) return;

      // While the initial getSession() above hasn't resolved yet, the
      // listener fires INITIAL_SESSION. Skip it to avoid a double-render
      // that would set loading=false prematurely.
      if (event === 'INITIAL_SESSION' && !initialised.current) return;

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

      // After initial load, make sure loading spinner goes away on any event
      if (mounted && initialised.current) setLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);  // intentionally empty — runs once on mount

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

