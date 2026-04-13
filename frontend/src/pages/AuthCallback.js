import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

/**
 * AuthCallback
 *
 * Supabase redirects here after a magic-link click:
 *   https://yourapp.com/auth/callback?code=...
 *
 * With flowType: 'pkce', the JS client automatically exchanges the `code`
 * query-param for a session when it detects it in the URL — we just need to
 * wait for onAuthStateChange to fire, then redirect appropriately.
 */
export default function AuthCallback() {
  const navigate = useNavigate();
  const [error, setError] = useState(null);

  useEffect(() => {
    let resolved = false;

    // The Supabase client handles the PKCE code exchange automatically when
    // detectSessionInUrl: true.  We subscribe to the auth state and redirect
    // once we have a confirmed session (or an error).
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (resolved) return;

      if (event === 'SIGNED_IN' && session) {
        resolved = true;
        subscription.unsubscribe();

        // Check if the user has a completed profile (has a name).
        // If not, send them to onboarding; otherwise to find-a-partner.
        supabase
          .from('profiles')
          .select('name')
          .eq('id', session.user.id)
          .single()
          .then(({ data }) => {
            if (data?.name?.trim()) {
              navigate('/find-a-partner', { replace: true });
            } else {
              navigate('/get-started', { replace: true });
            }
          });
      }

      if (event === 'TOKEN_REFRESHED' && session) {
        resolved = true;
        subscription.unsubscribe();
        navigate('/find-a-partner', { replace: true });
      }
    });

    // Safety fallback: if nothing fires within 10 s, show an error
    const timeout = setTimeout(() => {
      if (!resolved) {
        setError('Sign-in timed out. Please try again.');
        subscription.unsubscribe();
      }
    }, 10000);

    return () => {
      clearTimeout(timeout);
      subscription.unsubscribe();
    };
  }, [navigate]);

  if (error) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          background: '#1C0A30',
          gap: 16,
        }}
      >
        <p style={{ color: '#ef4444', fontFamily: 'Inter, sans-serif', fontSize: 14 }}>
          {error}
        </p>
        <button
          onClick={() => (window.location.href = '/get-started')}
          style={{
            padding: '10px 24px',
            background: '#D4880A',
            color: '#fff',
            border: 'none',
            borderRadius: 999,
            fontFamily: 'Inter, sans-serif',
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          Back to Sign In
        </button>
      </div>
    );
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        background: '#1C0A30',
        gap: 16,
      }}
    >
      {/* Spinner */}
      <div
        style={{
          width: 40,
          height: 40,
          border: '3px solid #D4880A',
          borderTopColor: 'transparent',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
        }}
      />
      <p
        style={{
          color: 'rgba(255,255,255,0.5)',
          fontFamily: 'Inter, sans-serif',
          fontSize: 13,
        }}
      >
        Signing you in…
      </p>
    </div>
  );
}

