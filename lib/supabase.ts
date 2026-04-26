import { createClient, SupabaseClient } from '@supabase/supabase-js';

function getEnv(key: string, fallback: string): string {
  return process.env[key] || fallback;
}

function isPreviewDeployment(): boolean {
  const branch = process.env.VERCEL_GIT_COMMIT_REF;
  return branch === 'preview';
}

export function getServerClient(url?: string, key?: string): SupabaseClient {
  // If url/key explicitly provided, use those (for cloud-backup cross-db queries)
  if (url && key) {
    return createClient(url, key, { auth: { persistSession: false } });
  }

  // Detect environment from Vercel branch
  if (isPreviewDeployment()) {
    const previewUrl = getEnv('PREVIEW_SUPABASE_URL', '');
    const previewKey = getEnv('PREVIEW_SUPABASE_SERVICE_ROLE_KEY', '');
    if (previewUrl && previewKey) {
      return createClient(previewUrl, previewKey, { auth: { persistSession: false } });
    }
  }

  // Fall back to production credentials
  const supabaseUrl = getEnv('NEXT_PUBLIC_SUPABASE_URL', '');
  const supabaseKey = getEnv('SUPABASE_SERVICE_ROLE_KEY', '') || getEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', '');
  return createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false }
  });
}

export function createServerClient(url?: string, key?: string): SupabaseClient {
  return getServerClient(url, key);
}
