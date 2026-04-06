import { createClient, SupabaseClient } from '@supabase/supabase-js';

function getEnv(key: string, fallback: string): string {
  return process.env[key] || fallback;
}

export function getServerClient(): SupabaseClient {
  const supabaseUrl = getEnv('NEXT_PUBLIC_SUPABASE_URL', '');
  const supabaseKey = getEnv('SUPABASE_SERVICE_ROLE_KEY', '') || getEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', '');
  return createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false }
  });
}

export function createServerClient(): SupabaseClient {
  return getServerClient();
}
