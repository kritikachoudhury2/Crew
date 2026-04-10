import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

export default function AuthCallback() {
  const navigate = useNavigate();
  const handled = useRef(false);

  useEffect(() => {
    // CRITICAL: Do NOT call getSession() here — the Supabase client automatically
    // detects the hash fragment and exchanges the token internally.
    // Calling getSession() simultaneously causes "body stream already read" error.
    // Instead, listen for the SIGNED_IN event which fires AFTER the exchange completes.

    const routeUser = async (session) => {
      if (handled.current) return;
      handled.current = true;

      if (!session) {
        navigate('/get-started', { replace: true });
        return;
      }

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
    };

    // Listen for auth state change — this fires once the token exchange is done
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION') {
          if (session) {
            routeUser(session);
          }
        }
      }
    );

    // Fallback: if onAuthStateChange already fired before this effect ran,
    // check once after a short delay (the client may have already processed the hash)
    const fallbackTimer = setTimeout(async () => {
      if (handled.current) return;
      try {
        const { data: { session } } = await supabase.auth.getSession();
        routeUser(session);
      } catch {
        if (!handled.current) {
          handled.current = true;
          navigate('/get-started', { replace: true });
        }
      }
    }, 2000);

    return () => {
      subscription?.unsubscribe();
      clearTimeout(fallbackTimer);
    };
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
