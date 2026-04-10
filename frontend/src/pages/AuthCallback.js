import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

export default function AuthCallback() {
  const navigate = useNavigate();
  const handled = useRef(false);

  useEffect(() => {
    // ──────────────────────────────────────────────────────────────
    // ZERO getSession() calls here.
    // The Supabase client (with detectSessionInUrl: true) automatically
    // reads the hash fragment / PKCE code and exchanges it for a session.
    // We just listen for the resulting SIGNED_IN event.
    // The AuthProvider's onAuthStateChange will also fire, which is fine —
    // it updates context state. This local listener only handles ROUTING.
    // ──────────────────────────────────────────────────────────────

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (handled.current) return;

        if (event === 'SIGNED_IN' && session) {
          handled.current = true;

          try {
            const { data } = await supabase
              .from('profiles')
              .select('id, name, sport')
              .eq('id', session.user.id)
              .single();

            if (data && data.name && data.name.trim() !== '') {
              navigate('/find-a-partner', { replace: true });
            } else {
              navigate('/get-started', { replace: true });
            }
          } catch {
            navigate('/get-started', { replace: true });
          }
        }

        // If Supabase fires INITIAL_SESSION with no session (e.g. expired link),
        // redirect to get-started after a brief grace period.
        if (event === 'INITIAL_SESSION' && !session) {
          // Give the PKCE exchange a moment — SIGNED_IN will follow if valid.
          setTimeout(() => {
            if (!handled.current) {
              handled.current = true;
              navigate('/get-started', { replace: true });
            }
          }, 3000);
        }
      }
    );

    return () => subscription?.unsubscribe();
  }, [navigate]);

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      height: '100vh', background: '#1C0A30'
    }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{
          width: 40, height: 40, border: '3px solid #D4880A',
          borderTopColor: 'transparent', borderRadius: '50%',
          animation: 'spin 0.8s linear infinite', margin: '0 auto 16px'
        }} />
        <p style={{ color: 'rgba(255,255,255,0.7)', fontFamily: 'Inter', fontSize: 14 }}>
          Signing you in...
        </p>
      </div>
    </div>
  );
}
