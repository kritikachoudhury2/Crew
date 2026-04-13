import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

export default function AuthCallback() {
  const navigate = useNavigate();
  const handled = useRef(false);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (handled.current) return;
      if (event === 'SIGNED_IN' && session) {
        handled.current = true;
        subscription.unsubscribe();
        supabase.from('profiles').select('name').eq('id', session.user.id).single()
          .then(({ data }) => navigate(data?.name?.trim() ? '/find-a-partner' : '/get-started', { replace: true }))
          .catch(() => navigate('/get-started', { replace: true }));
      }
    });
    return () => subscription.unsubscribe();
  }, [navigate]);

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#1C0A30' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: 40, height: 40, border: '3px solid #D4880A', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 16px' }} />
        <p style={{ color: 'rgba(255,255,255,0.7)', fontFamily: 'Inter', fontSize: 14 }}>Signing you in...</p>
      </div>
    </div>
  );
}
