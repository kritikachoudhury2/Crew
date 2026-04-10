import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';

export default function AuthCallback() {
  const navigate = useNavigate();
  const { session, loading } = useAuth();
  const handled = useRef(false);

  useEffect(() => {
    if (loading || handled.current) return;

    if (session?.user) {
      handled.current = true;
      supabase
        .from('profiles')
        .select('id, name')
        .eq('id', session.user.id)
        .single()
        .then(({ data }) => {
          if (data?.name?.trim()) {
            navigate('/find-a-partner', { replace: true });
          } else {
            navigate('/get-started', { replace: true });
          }
        })
        .catch(() => navigate('/get-started', { replace: true }));
    } else {
      // No session after AuthContext finished loading → expired or invalid link
      const timer = setTimeout(() => {
        if (!handled.current) {
          handled.current = true;
          navigate('/get-started', { replace: true });
        }
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [session, loading, navigate]);

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
