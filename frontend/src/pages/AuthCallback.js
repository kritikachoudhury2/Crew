import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

export default function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        supabase
          .from('profiles')
          .select('id, name, sport')
          .eq('id', session.user.id)
          .single()
          .then(({ data }) => {
            if (data && data.name && data.name.trim() !== '') {
              navigate('/find-a-partner');
            } else {
              navigate('/get-started');
            }
          });
      } else {
        navigate('/get-started');
      }
    });
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
