import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // Let the Supabase client handle token exchange from URL hash automatically.
    // detectSessionInUrl: true is the default — the client will parse #access_token
    // from the magic link redirect and exchange it for a session.
    // We MUST NOT call getSession() or parse the hash manually at the same time.
    detectSessionInUrl: true,
    autoRefreshToken: true,
    persistSession: true,
  },
});
