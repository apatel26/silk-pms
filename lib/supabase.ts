import { createClient, SupabaseClient } from '@supabase/supabase-js';

const DUMMY_URL = 'https://placeholder.supabase.co';

function getEnv(key: string, fallback: string): string {
  return process.env[key] || fallback;
}

export function getServerClient(): SupabaseClient {
  const supabaseUrl = getEnv('NEXT_PUBLIC_SUPABASE_URL', DUMMY_URL);
  const supabaseServiceKey = getEnv('SUPABASE_SERVICE_ROLE_KEY', 'placeholder');
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false }
  });
}

export function createServerClient(): SupabaseClient {
  return getServerClient();
}
