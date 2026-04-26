import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { cookies } from 'next/headers';
import { createAuditLog } from '@/lib/audit';

export const dynamic = 'force-dynamic';

// This endpoint syncs CONFIGURATION data from production TO preview
// It does NOT sync entries, customers, or other operational data

const AUTH_COOKIE_NAME = 'pms_session';

function decodeSession(token: string): any {
  try {
    return JSON.parse(Buffer.from(token, 'base64').toString());
  } catch {
    return null;
  }
}

async function getCurrentUser() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(AUTH_COOKIE_NAME);
  if (!sessionCookie?.value) return null;
  return decodeSession(sessionCookie.value);
}

// Tables that are SAFE to sync (configuration/settings)
const SAFE_TO_SYNC_TABLES = [
  'property_settings',
  'rate_plans',
  'rooms',
  'rv_sites',
  'roles',
  'users',
];

// Tables to NEVER touch during sync
const PROTECTED_TABLES = [
  'entries',
  'customers',
  'housekeeping_tasks',
  'audit_log',
  'backup_records',
];

// POST /api/sync-preview - Sync production data TO preview
export async function POST(request: Request) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get environment URLs
    const previewUrl = process.env.PREVIEW_SUPABASE_URL;
    const previewKey = process.env.PREVIEW_SUPABASE_SERVICE_ROLE_KEY;
    const productionUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const productionKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!previewUrl || !previewKey || !productionUrl || !productionKey) {
      return NextResponse.json({ error: 'Database URLs not configured' }, { status: 500 });
    }

    const previewDb = createServerClient(previewUrl, previewKey);
    const productionDb = createServerClient(productionUrl, productionKey);

    const results: any = {
      synced: [],
      errors: [],
    };

    // Sync each safe table
    for (const table of SAFE_TO_SYNC_TABLES) {
      try {
        // Get data from production
        const { data: prodData, error: fetchError } = await productionDb
          .from(table)
          .select('*');

        if (fetchError) {
          results.errors.push({ table, error: fetchError.message });
          continue;
        }

        if (!prodData || prodData.length === 0) {
          results.synced.push({ table, status: 'empty', count: 0 });
          continue;
        }

        // Clear preview table first, then insert fresh data
        // This ensures preview always has exact copy of production config
        await previewDb.from(table).delete().neq('id', '00000000-0000-0000-0000-000000000000');

        // Insert all production data into preview
        const { error: insertError } = await previewDb
          .from(table)
          .insert(prodData);

        if (insertError) {
          results.errors.push({ table, error: insertError.message });
        } else {
          results.synced.push({ table, status: 'success', count: prodData.length });
        }
      } catch (err: any) {
        results.errors.push({ table, error: err.message });
      }
    }

    // Log the sync
    await createAuditLog({
      userId: currentUser.userId,
      username: currentUser.username,
      action: 'sync_preview_from_production',
      entity_type: 'system',
      entity_id: null,
      details: {
        synced_tables: SAFE_TO_SYNC_TABLES,
        protected_tables: PROTECTED_TABLES,
        results,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Preview synced with production data',
      results,
    });

  } catch (error) {
    console.error('Error syncing preview:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

// GET /api/sync-preview - Check sync status
export async function GET() {
  try {
    const previewUrl = process.env.PREVIEW_SUPABASE_URL;
    const previewKey = process.env.PREVIEW_SUPABASE_SERVICE_ROLE_KEY;
    const productionUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const productionKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!previewUrl || !previewKey || !productionUrl || !productionKey) {
      return NextResponse.json({ configured: false });
    }

    const previewDb = createServerClient(previewUrl, previewKey);
    const productionDb = createServerClient(productionUrl, productionKey);

    const status: any = {
      configured: true,
      tables: {},
    };

    for (const table of SAFE_TO_SYNC_TABLES) {
      const [previewCount, prodCount] = await Promise.all([
        previewDb.from(table).select('*', { count: 'exact', head: true }),
        productionDb.from(table).select('*', { count: 'exact', head: true }),
      ]);

      status.tables[table] = {
        preview: previewCount.count || 0,
        production: prodCount.count || 0,
      };
    }

    return NextResponse.json(status);

  } catch (error) {
    console.error('Error checking sync status:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}