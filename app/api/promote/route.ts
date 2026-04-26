import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { cookies } from 'next/headers';
import { createAuditLog } from '@/lib/audit';

export const dynamic = 'force-dynamic';

// This endpoint handles safe migration from preview to production
// It ONLY syncs configuration data, NOT entries or customers

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

// Tables to NEVER touch during migration
const PROTECTED_TABLES = [
  'entries',
  'customers',
  'housekeeping_tasks',
  'audit_log',
  'backup_records',
];

// POST /api/promote - Sync preview data to production (safe migration)
export async function POST(request: Request) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only admins can trigger promotion
    if (currentUser.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const { action } = body;

    if (action !== 'promote_preview') {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
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
        // Get data from preview
        const { data: previewData, error: fetchError } = await previewDb
          .from(table)
          .select('*');

        if (fetchError) {
          results.errors.push({ table, error: fetchError.message });
          continue;
        }

        if (!previewData || previewData.length === 0) {
          results.synced.push({ table, status: 'empty', count: 0 });
          continue;
        }

        // For production, we'll do a "safe upsert"
        // - If row exists by unique key, update it
        // - If doesn't exist, insert it
        // This preserves production data while syncing config changes

        for (const row of previewData) {
          // Determine unique key for each table
          let uniqueField = 'id';
          let uniqueValue = row.id;

          if (table === 'rooms') {
            uniqueField = 'number';
            uniqueValue = row.number;
          } else if (table === 'rv_sites') {
            uniqueField = 'site_number';
            uniqueValue = row.site_number;
          } else if (table === 'rate_plans' || table === 'roles') {
            uniqueField = 'name';
            uniqueValue = row.name;
          } else if (table === 'property_settings') {
            // Only one row, just update it
            uniqueField = 'id';
            uniqueValue = row.id;
          } else if (table === 'users') {
            uniqueField = 'username';
            uniqueValue = row.username;
          }

          // Check if exists in production
          const { data: existing } = await productionDb
            .from(table)
            .select('id')
            .eq(uniqueField, uniqueValue)
            .limit(1);

          if (existing && existing.length > 0) {
            // Update existing row (preserve production-specific data)
            const { error: updateError } = await productionDb
              .from(table)
              .update(row)
              .eq('id', existing[0].id);

            if (updateError) {
              results.errors.push({ table, operation: 'update', error: updateError.message });
            }
          } else {
            // Insert new row
            const { error: insertError } = await productionDb
              .from(table)
              .insert(row);

            if (insertError) {
              results.errors.push({ table, operation: 'insert', error: insertError.message });
            }
          }
        }

        results.synced.push({ table, status: 'success', count: previewData.length });
      } catch (err: any) {
        results.errors.push({ table, error: err.message });
      }
    }

    // Log the promotion
    await createAuditLog({
      userId: currentUser.userId,
      username: currentUser.username,
      action: 'promote_preview_to_production',
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
      message: 'Preview promoted to production',
      results,
    });

  } catch (error) {
    console.error('Error promoting preview:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

// GET /api/promote - Check sync status
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
    console.error('Error checking promote status:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}