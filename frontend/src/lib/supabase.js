import { createClient } from '@supabase/supabase-js';

// This is a Create React App (CRA/Craco) project — env vars MUST be REACT_APP_*
// In your .env file use: REACT_APP_SUPABASE_URL and REACT_APP_SUPABASE_ANON_KEY
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    '[Crew] Missing Supabase env vars. ' +
    'Ensure REACT_APP_SUPABASE_URL and REACT_APP_SUPABASE_ANON_KEY are set in your .env file.'
  );
}

export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '', {
  auth: {
    detectSessionInUrl: true,
    persistSession: true,
    autoRefreshToken: true,
    storageKey: 'crew-auth-token',
    // PKCE is required for magic-link / OTP flows with Supabase
    flowType: 'pkce',
  },
});

export default supabase;




