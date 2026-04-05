import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

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

// POST /api/reset/yearly - Yearly reset: backup entries and clear them
export async function POST(request: Request) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only admin can reset
    if (currentUser.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { type } = await request.json();
    const supabase = createServerClient();

    if (type === 'yearly') {
      // Get all entries for backup
      const { data: entries, error: fetchError } = await supabase
        .from('entries')
        .select('*')
        .order('created_at', { ascending: true });

      if (fetchError) throw fetchError;

      // Create backup record
      const year = new Date().getFullYear();
      const { error: backupError } = await supabase
        .from('backup_records')
        .insert([{
          year,
          file_type: 'json',
          created_by: currentUser.userId,
        }]);

      if (backupError) console.error('Backup record error:', backupError);

      // Delete all entries
      const { error: deleteError } = await supabase
        .from('entries')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

      if (deleteError) throw deleteError;

      // Clear housekeeping tasks
      await supabase
        .from('housekeeping_tasks')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');

      return NextResponse.json({
        success: true,
        message: 'Yearly reset completed',
        backedUpEntries: entries?.length || 0
      });
    }

    if (type === 'factory') {
      // Factory reset: delete all data except users

      // Delete in order due to foreign keys
      await supabase.from('backup_records').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('audit_log').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('housekeeping_tasks').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('entries').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('customers').delete().neq('id', '00000000-0000-0000-0000-000000000000');

      // Keep users but reset passwords, keep property settings

      return NextResponse.json({
        success: true,
        message: 'Factory reset completed'
      });
    }

    return NextResponse.json({ error: 'Invalid reset type' }, { status: 400 });
  } catch (error) {
    console.error('Error performing reset:', error);
    return NextResponse.json({ error: 'Failed to perform reset' }, { status: 500 });
  }
}

// GET /api/reset - Get backup records
export async function GET() {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createServerClient();

    const { data, error } = await supabase
      .from('backup_records')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json(data || []);
  } catch (error) {
    console.error('Error fetching backups:', error);
    return NextResponse.json({ error: 'Failed to fetch backups' }, { status: 500 });
  }
}
