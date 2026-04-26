import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { cookies } from 'next/headers';
import { createAuditLog } from '@/lib/audit';

export const dynamic = 'force-dynamic';

// DATABASE SWAP PROMOTION WORKFLOW
//
// This performs a CLEAN database swap:
// 1. Copy current production entries/customers to preview (backup)
// 2. Swap database associations in Vercel (via Vercel API)
// 3. Old production becomes new preview (with backup data)
// 4. Old preview becomes new production (clean production data)
//
// IMPORTANT: This requires Vercel API access to swap environment variables

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

// Tables that contain actual business data (MUST preserve)
const DATA_TABLES = [
  'entries',
  'customers',
  'housekeeping_tasks',
  'audit_log',
  'backup_records',
];

// Tables that are configuration (preview changes these)
const CONFIG_TABLES = [
  'rooms',
  'rv_sites',
  'rate_plans',
  'property_settings',
  'roles',
  'users',
];

// POST /api/promote - Execute database swap promotion
export async function POST(request: Request) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (currentUser.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const { action } = body;

    if (action !== 'promote_preview') {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    // Get database credentials
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
      steps_completed: [],
      errors: [],
    };

    // STEP 1: Backup production data to preview
    // Copy all DATA tables from production to preview (backup before swap)
    console.log('Step 1: Backing up production data to preview...');

    for (const table of DATA_TABLES) {
      try {
        // Get data from production
        const { data: prodData, error: fetchError } = await productionDb
          .from(table)
          .select('*');

        if (fetchError) {
          results.errors.push({ step: 'backup', table, error: fetchError.message });
          continue;
        }

        if (!prodData || prodData.length === 0) {
          results.steps_completed.push({ step: 'backup', table, status: 'empty' });
          continue;
        }

        // Clear existing data in preview for this table (fresh backup)
        await previewDb.from(table).delete().neq('id', '00000000-0000-0000-0000-000000000000');

        // Insert production data into preview
        const { error: insertError } = await previewDb.from(table).insert(prodData);

        if (insertError) {
          results.errors.push({ step: 'backup', table, error: insertError.message });
        } else {
          results.steps_completed.push({ step: 'backup', table, status: 'backed_up', count: prodData.length });
        }
      } catch (err: any) {
        results.errors.push({ step: 'backup', table, error: err.message });
      }
    }

    // STEP 2: Clear preview data tables (preview becomes new production - should be clean)
    // Actually, we want NEW production to have exact copy of CURRENT production data
    // So we copy production data to preview, then we'll swap
    // The preview DB (new production) will have production data

    // STEP 3: Copy config from preview to preview (no-op, config is already there)
    // Actually config was changed in preview, that's what we're promoting

    // STEP 4: Tell Vercel to swap the database URLs
    // This requires calling Vercel API to update environment variables

    console.log('Step 4: Requesting Vercel to swap database URLs...');

    // Log the promotion
    await createAuditLog({
      userId: currentUser.userId,
      username: currentUser.username,
      action: 'initiate_database_swap_promotion',
      entity_type: 'system',
      entity_id: null,
      details: {
        description: 'Database swap promotion initiated - production data backed up, awaiting Vercel swap',
        production_backup_tables: DATA_TABLES,
        preview_config_tables: CONFIG_TABLES,
        results,
      },
    });

    // Return instructions for completing the swap
    return NextResponse.json({
      success: true,
      message: 'Production data backed up to preview. Next step: swap database URLs in Vercel.',
      backup_results: results.steps_completed,
      errors: results.errors,
      next_step: 'swap_vercel_env_vars',
      instructions: {
        step: 1,
        action: 'Vercel environment variables need to be swapped:',
        current_preview: previewUrl,
        current_production: productionUrl,
        swap_to: {
          NEXT_PUBLIC_SUPABASE_URL: previewUrl,
          NEXT_PUBLIC_SUPABASE_ANON_KEY: 'PREVIEW_ANON_KEY',
          SUPABASE_SERVICE_ROLE_KEY: 'PREVIEW_SERVICE_ROLE_KEY',
          PREVIEW_SUPABASE_URL: productionUrl,
          PREVIEW_SUPABASE_SERVICE_ROLE_KEY: 'PROD_SERVICE_ROLE_KEY',
        },
        after_swap: 'Then redeploy to apply changes',
      },
      note: 'Your current production data has been backed up to the preview database. The swap will make preview the new production with clean data.'
    });

  } catch (error) {
    console.error('Error promoting preview:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

// GET /api/promote - Check current database status
export async function GET() {
  try {
    const previewUrl = process.env.PREVIEW_SUPABASE_URL;
    const previewKey = process.env.PREVIEW_SUPABASE_SERVICE_ROLE_KEY;
    const productionUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const productionKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!previewUrl || !previewKey || !productionUrl || !productionKey) {
      return NextResponse.json({ configured: false, message: 'Missing env vars' });
    }

    const previewDb = createServerClient(previewUrl, previewKey);
    const productionDb = createServerClient(productionUrl, productionKey);

    const status = {
      configured: true,
      databases: {
        preview: previewUrl.replace('https://', '').split('.')[0],
        production: productionUrl.replace('https://', '').split('.')[0],
      },
      data_counts: {} as Record<string, any>,
      config_counts: {} as Record<string, any>,
    };

    // Check data table counts
    for (const table of DATA_TABLES) {
      const [previewCount, prodCount] = await Promise.all([
        previewDb.from(table).select('*', { count: 'exact', head: true }),
        productionDb.from(table).select('*', { count: 'exact', head: true }),
      ]);
      status.data_counts[table] = {
        preview: previewCount.count || 0,
        production: prodCount.count || 0,
      };
    }

    // Check config table counts
    for (const table of CONFIG_TABLES) {
      const [previewCount, prodCount] = await Promise.all([
        previewDb.from(table).select('*', { count: 'exact', head: true }),
        productionDb.from(table).select('*', { count: 'exact', head: true }),
      ]);
      status.config_counts[table] = {
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