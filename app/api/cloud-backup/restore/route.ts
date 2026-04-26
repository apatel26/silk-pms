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

// POST /api/cloud-backup/restore - Upload and restore a backup Excel file
export async function POST(request: Request) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    if (!file.name.endsWith('.xlsx')) {
      return NextResponse.json({ error: 'Only .xlsx files are supported' }, { status: 400 });
    }

    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(new Uint8Array(buffer), { type: 'array' });

    const mainDb = createServerClient();
    let totalRestored = 0;
    let guestRestored = 0;
    let rvRestored = 0;

    // Helper to convert Excel date serial to ISO date string
    const excelToDate = (val: any): string | null => {
      if (!val) return null;
      if (typeof val === 'number') {
        const date = XLSX.SSF.parse_date_code(val);
        return `${date.y}-${String(date.m).padStart(2, '0')}-${String(date.d).padStart(2, '0')}`;
      }
      if (typeof val === 'string') {
        const d = new Date(val);
        if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
      }
      return String(val);
    };

    // Restore Guest Rooms sheet
    const guestSheet = workbook.SheetNames.find(n => n === 'Guest Rooms');
    if (guestSheet) {
      const guestData = XLSX.utils.sheet_to_json(workbook.Sheets[guestSheet], { defval: '' });
      for (const row of guestData) {
        const r = row as any;
        if (!r['Date']) continue; // Skip header row or empty rows

        const checkIn = excelToDate(r['Check In']);
        const checkOut = excelToDate(r['Check Out']);

        const { data, error } = await mainDb
          .from('entries')
          .insert([{
            entry_type: 'guest',
            date: excelToDate(r['Date']) || new Date().getFullYear() + '-01-01',
            room_number: String(r['Room'] || '').padStart(3, '0'),
            customer_name: r['Guest Name'] || '',
            check_in: checkIn,
            check_out: checkOut,
            num_nights: parseInt(r['Nights']) || 1,
            room_rate: parseFloat(r['Rate']) || 0,
            total: parseFloat(r['Total']) || 0,
            cash: parseFloat(r['Cash']) || 0,
            cc: parseFloat(r['CC']) || 0,
            status: r['Status'] || 'active',
          }])
          .select()
          .single();

        if (!error && data) {
          guestRestored++;
          totalRestored++;
        }
      }
    }

    // Restore RV Sites sheet
    const rvSheet = workbook.SheetNames.find(n => n === 'RV Sites');
    if (rvSheet) {
      const rvData = XLSX.utils.sheet_to_json(workbook.Sheets[rvSheet], { defval: '' });
      for (const row of rvData) {
        const r = row as any;
        if (!r['Date']) continue;

        const checkIn = excelToDate(r['Check In']);
        const checkOut = excelToDate(r['Check Out']);

        const { data, error } = await mainDb
          .from('entries')
          .insert([{
            entry_type: 'rv',
            date: excelToDate(r['Date']) || new Date().getFullYear() + '-01-01',
            site_number: String(r['Site'] || ''),
            customer_name: r['Guest Name'] || '',
            check_in: checkIn,
            check_out: checkOut,
            num_nights: parseInt(r['Nights']) || 1,
            room_rate: parseFloat(r['Rate']) || 0,
            total: parseFloat(r['Total']) || 0,
            cash: parseFloat(r['Cash']) || 0,
            cc: parseFloat(r['CC']) || 0,
            status: r['Status'] || 'active',
          }])
          .select()
          .single();

        if (!error && data) {
          rvRestored++;
          totalRestored++;
        }
      }
    }

    // Audit log restore
    await createAuditLog({
      userId: currentUser.userId,
      username: currentUser.username,
      action: 'create',
      entity_type: 'settings',
      entity_id: null,
      details: { type: 'backup_restore', fileName: file.name, guestRestored, rvRestored, totalRestored },
    });

    return NextResponse.json({
      success: true,
      message: `Restored ${totalRestored} entries`,
      guestRooms: guestRestored,
      rvSites: rvRestored,
    });
  } catch (error) {
    console.error('Error restoring backup:', error);
    return NextResponse.json({ error: 'Failed to restore backup', details: String(error) }, { status: 500 });
  }
}
