import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { cookies } from 'next/headers';
import * as XLSX from 'xlsx';
import { createAuditLog } from '@/lib/audit';

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

// GET /api/cloud-backup - List backups from backup Supabase
export async function GET() {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const backupSupabaseUrl = process.env.BACKUP_SUPABASE_URL;
    const backupServiceKey = process.env.BACKUP_SUPABASE_SERVICE_ROLE_KEY;

    if (!backupSupabaseUrl || !backupServiceKey) {
      return NextResponse.json({ error: 'Backup database not configured' }, { status: 500 });
    }

    const backupDb = createServerClient(backupSupabaseUrl, backupServiceKey);

    const { data, error } = await backupDb
      .from('silk_pms_backups')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return NextResponse.json(data || []);
  } catch (error) {
    console.error('Error fetching backups:', error);
    return NextResponse.json({ error: 'Failed to fetch backups' }, { status: 500 });
  }
}

// POST /api/cloud-backup - Create and upload backup
export async function POST(request: Request) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { year } = await request.json();
    const targetYear = year || new Date().getFullYear();
    const yearStart = `${targetYear}-01-01`;
    const yearEnd = `${targetYear}-12-31`;

    // Fetch entries from main database
    const mainDb = createServerClient();
    const { data: entries, error: entriesError } = await mainDb
      .from('entries')
      .select('*')
      .gte('date', yearStart)
      .lte('date', yearEnd);

    if (entriesError) throw entriesError;

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

    // Upload to backup Supabase
    const backupSupabaseUrl = process.env.BACKUP_SUPABASE_URL;
    const backupServiceKey = process.env.BACKUP_SUPABASE_SERVICE_ROLE_KEY;

    if (!backupSupabaseUrl || !backupServiceKey) {
      return NextResponse.json({ error: 'Backup database not configured' }, { status: 500 });
    }

    const backupDb = createServerClient(backupSupabaseUrl, backupServiceKey);
    const filePath = `${targetYear}/${fileName}`;

    // Upload file to storage
    const { error: uploadError } = await backupDb.storage
      .from('silk-pms-backups')
      .upload(filePath, excelBuffer, {
        contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        upsert: true,
      });

    if (uploadError) {
      console.error('Error uploading backup file:', uploadError);
      throw uploadError;
    }

    // Get public URL
    const { data: urlData } = backupDb.storage
      .from('silk-pms-backups')
      .getPublicUrl(filePath);

    // Save metadata
    const { data: metaData, error: metaError } = await backupDb
      .from('silk_pms_backups')
      .insert([{
        year: targetYear,
        file_name: fileName,
        file_path: urlData.publicUrl,
        file_size: excelBuffer.length,
        entry_count: entries?.length || 0,
        created_by: currentUser.userId,
      }])
      .select()
      .single();

    if (metaError) {
      console.error('Error saving backup metadata:', metaError);
    }

    // Also create local backup record in main DB
    await mainDb.from('backup_records').insert([{
      year: targetYear,
      file_type: 'xlsx',
      created_by: currentUser.userId,
    }]);

    // Audit log
    await createAuditLog({
      userId: currentUser.userId,
      username: currentUser.username,
      action: 'export',
      entity_type: 'settings',
      entity_id: null,
      details: { type: 'cloud_backup', year: targetYear, fileName, entryCount: entries?.length || 0 },
    });

    return NextResponse.json({
      success: true,
      message: `Backup created for ${targetYear}`,
      fileName,
      fileUrl: urlData.publicUrl,
      entryCount: entries?.length || 0,
    });
  } catch (error) {
    console.error('Error creating cloud backup:', error);
    return NextResponse.json({ error: 'Failed to create backup', details: String(error) }, { status: 500 });
  }
}

// DELETE /api/cloud-backup - Delete a backup
export async function DELETE(request: Request) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id, filePath, year } = await request.json();

    const backupSupabaseUrl = process.env.BACKUP_SUPABASE_URL;
    const backupServiceKey = process.env.BACKUP_SUPABASE_SERVICE_ROLE_KEY;

    if (!backupSupabaseUrl || !backupServiceKey) {
      return NextResponse.json({ error: 'Backup database not configured' }, { status: 500 });
    }

    const backupDb = createServerClient(backupSupabaseUrl, backupServiceKey);

    // Delete file from storage
    const fileName = `American_Inn_${year}_Backup.xlsx`;
    await backupDb.storage
      .from('silk-pms-backups')
      .remove([`${year}/${fileName}`]);

    // Delete metadata
    if (id) {
      await backupDb
        .from('silk_pms_backups')
        .delete()
        .eq('id', id);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting backup:', error);
    return NextResponse.json({ error: 'Failed to delete backup' }, { status: 500 });
  }
}
