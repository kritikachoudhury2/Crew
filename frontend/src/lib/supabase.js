import { createClient } from '@supabase/supabase-js';

// This is a Create React App (CRA/Craco) project — env vars MUST be REACT_APP_*
// In your .env file use: REACT_APP_SUPABASE_URL and REACT_APP_SUPABASE_ANON_KEY
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('[Crew] Missing Supabase env vars. Check REACT_APP_SUPABASE_URL and REACT_APP_SUPABASE_ANON_KEY in Vercel settings.');
}

export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '', {
  auth: {
    detectSessionInUrl: true,
    persistSession: true,
    autoRefreshToken: true,
    flowType: 'implicit',
  },
});

export default supabase;




