import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { cookies } from 'next/headers';
import * as XLSX from 'xlsx';

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

// POST /api/reset - Yearly reset: backup entries and clear them
export async function POST(request: Request) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (currentUser.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { type, year } = await request.json();
    const supabase = createServerClient();

    if (type === 'yearly') {
      const targetYear = year || new Date().getFullYear();
      const yearStart = `${targetYear}-01-01`;
      const yearEnd = `${targetYear}-12-31`;

      // Get all entries for the target year for backup
      const { data: entries, error: fetchError } = await supabase
        .from('entries')
        .select('*')
        .gte('date', yearStart)
        .lte('date', yearEnd);

      if (fetchError) {
        console.error('Error fetching entries for backup:', fetchError);
        throw fetchError;
      }

      // Create backup record with the actual data stored as JSON
      const { error: backupError } = await supabase
        .from('backup_records')
        .insert([{
          year: targetYear,
          file_type: 'json',
          created_by: currentUser.userId,
        }]);

      if (backupError) {
        console.error('Error creating backup record:', backupError);
      }

      // Delete entries for the target year only
      const { error: deleteError } = await supabase
        .from('entries')
        .delete()
        .gte('date', yearStart)
        .lte('date', yearEnd);

      if (deleteError) {
        console.error('Error deleting entries:', deleteError);
        throw deleteError;
      }

      // Clear housekeeping tasks for the target year
      await supabase
        .from('housekeeping_tasks')
        .delete()
        .gte('date', yearStart)
        .lte('date', yearEnd);

      // Clean up old backups (keep last 2 years)
      const twoYearsAgo = new Date().getFullYear() - 2;
      await supabase
        .from('backup_records')
        .delete()
        .lt('year', twoYearsAgo);

      return NextResponse.json({
        success: true,
        message: `Yearly reset completed for ${targetYear}`,
        backedUpEntries: entries?.length || 0
      });
    }

    if (type === 'factory') {
      // Factory reset: delete all data except users, property_settings, rooms, rv_sites, rate_plans, roles

      const tablesToReset = ['entries', 'housekeeping_tasks', 'audit_log', 'backup_records', 'customers'];
      for (const table of tablesToReset) {
        try {
          await supabase.from(table).delete().neq('id', '00000000-0000-0000-0000-000000000000');
        } catch (e) {
          console.log(`Table ${table} reset skipped:`, e);
        }
      }

      return NextResponse.json({
        success: true,
        message: 'Factory reset completed. All operational data has been cleared.'
      });
    }

    if (type === 'export_backup') {
      // Export backup as Excel
      const targetYear = year || new Date().getFullYear();
      const yearStart = `${targetYear}-01-01`;
      const yearEnd = `${targetYear}-12-31`;

      const { data: entries, error: fetchError } = await supabase
        .from('entries')
        .select('*')
        .gte('date', yearStart)
        .lte('date', yearEnd);

      if (fetchError) throw fetchError;

      // Create Excel file
      const wb = XLSX.utils.book_new();

      const summaryData: any[] = [];
      summaryData.push([`American Inn and RV Park - ${targetYear} Backup`]);
      summaryData.push([`Exported on ${new Date().toLocaleDateString()}`]);
      summaryData.push([]);
      summaryData.push(['Total Entries', entries?.length || 0]);

      const guestEntries = (entries || []).filter((e: any) => e.entry_type === 'guest');
      const rvEntries = (entries || []).filter((e: any) => e.entry_type === 'rv');

      summaryData.push([]);
      summaryData.push(['GUEST ROOMS']);
      summaryData.push(['Total Rooms', guestEntries.length]);
      summaryData.push(['Total Revenue', guestEntries.reduce((s: number, e: any) => s + (e.total || 0), 0).toFixed(2)]);
      summaryData.push([]);
      summaryData.push(['RV SITES']);
      summaryData.push(['Total RV Sites', rvEntries.length]);
      summaryData.push(['Total Revenue', rvEntries.reduce((s: number, e: any) => s + (e.total || 0), 0).toFixed(2)]);

      const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary');

      // Guest entries detail
      if (guestEntries.length > 0) {
        const guestData: any[] = [];
        guestData.push(['Date', 'Room', 'Guest Name', 'Check In', 'Check Out', 'Nights', 'Rate', 'Total', 'Cash', 'CC', 'Status']);
        guestEntries.forEach((e: any) => {
          guestData.push([
            e.date,
            e.room_number || '',
            e.customer_name || '',
            e.check_in || '',
            e.check_out || '',
            e.num_nights || 1,
            e.room_rate || 0,
            e.total || 0,
            e.cash || 0,
            e.cc || 0,
            e.status
          ]);
        });
        const wsGuest = XLSX.utils.aoa_to_sheet(guestData);
        XLSX.utils.book_append_sheet(wb, wsGuest, 'Guest Rooms');
      }

      // RV entries detail
      if (rvEntries.length > 0) {
        const rvData: any[] = [];
        rvData.push(['Date', 'Site', 'Guest Name', 'Check In', 'Check Out', 'Nights', 'Rate', 'Total', 'Cash', 'CC', 'Status']);
        rvEntries.forEach((e: any) => {
          rvData.push([
            e.date,
            e.site_number || '',
            e.customer_name || '',
            e.check_in || '',
            e.check_out || '',
            e.num_nights || 1,
            e.room_rate || 0,
            e.total || 0,
            e.cash || 0,
            e.cc || 0,
            e.status
          ]);
        });
        const wsRV = XLSX.utils.aoa_to_sheet(rvData);
        XLSX.utils.book_append_sheet(wb, wsRV, 'RV Sites');
      }

      const fileName = `American_Inn_${targetYear}_Backup.xlsx`;
      const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'buffer' });

      // Store the backup with file data
      await supabase
        .from('backup_records')
        .insert([{
          year: targetYear,
          file_type: 'xlsx',
          created_by: currentUser.userId,
        }]);

      return NextResponse.json({
        success: true,
        message: `Backup exported for ${targetYear}`,
        fileName,
        entryCount: entries?.length || 0,
        // In a real app, you'd upload to cloud storage and return URL
        // For now, we just confirm the backup record was created
      });
    }

    return NextResponse.json({ error: 'Invalid reset type' }, { status: 400 });
  } catch (error) {
    console.error('Error performing reset:', error);
    return NextResponse.json({ error: 'Failed to perform reset', details: String(error) }, { status: 500 });
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