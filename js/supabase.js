// MATCHDAY - Supabase client
// Completa estos dos valores con los datos de tu proyecto.
// Nunca uses aquí una secret/service_role key.
const SUPABASE_URL = 'https://owqvdjjfznrwuonatqbd.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_bGeaHkAmyBDUBugPX8ZIjQ_gqoly8zZ';

window.supabaseClient = supabase.createClient(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  }
);
