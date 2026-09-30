// MATCHDAY - Supabase client
// Completa estos dos valores con los datos de tu proyecto.
// Nunca uses aquí una secret/service_role key.
const SUPABASE_URL = 'PEGA_AQUI_TU_PROJECT_URL';
const SUPABASE_PUBLISHABLE_KEY = 'PEGA_AQUI_TU_PUBLISHABLE_KEY';

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
