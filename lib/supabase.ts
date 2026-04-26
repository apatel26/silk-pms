import { createClient, SupabaseClient } from '@supabase/supabase-js';

function getEnv(key: string, fallback: string): string {
  return process.env[key] || fallback;
}

export function getServerClient(url?: string, key?: string): SupabaseClient {
  const supabaseUrl = url || getEnv('NEXT_PUBLIC_SUPABASE_URL', '');
  const supabaseKey = key || getEnv('SUPABASE_SERVICE_ROLE_KEY', '') || getEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', '');
  return createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false }
  });
}

export function createServerClient(url?: string, key?: string): SupabaseClient {
  return getServerClient(url, key);
}
