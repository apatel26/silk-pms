import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { cookies } from 'next/headers';
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

// Helper to get tax rates from settings
async function getTaxRates() {
  const supabase = createServerClient();
  const { data } = await supabase
    .from('property_settings')
    .select('city_tax_rate, state_tax_rate')
    .limit(1)
    .single();
  return {
    cityTaxRate: data?.city_tax_rate || 0.07,
    stateTaxRate: data?.state_tax_rate || 0.06,
  };
}

// Helper to get default room rate from settings
async function getDefaultRoomRate() {
  const supabase = createServerClient();
  const { data } = await supabase
    .from('property_settings')
    .select('default_room_rate')
    .limit(1)
    .single();
  return data?.default_room_rate || 70;
}

// GET /api/entries - Get entries
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');
    const month = searchParams.get('month');
    const year = searchParams.get('year');
    const forHousekeeping = searchParams.get('housekeeping');
    const checkoutDate = searchParams.get('checkout_date');

    const supabase = createServerClient();

    let query = supabase
      .from('entries')
      .select('*')
      .order('created_at', { ascending: false });

    if (checkoutDate) {
      // For housekeeping auto: get entries checking out on this date
      query = query
        .eq('status', 'active')
        .eq('check_out', checkoutDate);
    } else if (forHousekeeping === 'true' && date) {
      // For housekeeping: get entries where guest is staying on this date
      // check_in <= date AND check_out >= date AND status is active
      query = query
        .eq('status', 'active')
        .lte('check_in', date)
        .gte('check_out', date);
    } else if (date) {
      query = query.eq('date', date);
    } else if (year) {
      // Yearly report: get all entries for a specific year
      const yearStart = `${year}-01-01`;
      const yearEnd = `${year}-12-31`;
      query = query.gte('date', yearStart).lte('date', yearEnd);
    } else if (month) {
      // Monthly report: get all entries for a specific month
      const [y, m] = month.split('-');
      const monthStart = `${y}-${m}-01`;
      const lastDay = new Date(parseInt(y), parseInt(m), 0).getDate();
      const monthEnd = `${y}-${m}-${lastDay}`;
      query = query.gte('date', monthStart).lte('date', monthEnd);
    }

    const { data, error } = await query;

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching entries:', error);
    return NextResponse.json({ error: 'Failed to fetch entries' }, { status: 500 });
  }
}

// POST /api/entries - Create entry
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const supabase = createServerClient();

    // Get tax rates from settings
    const { cityTaxRate, stateTaxRate } = await getTaxRates();

    const {
      entry_type,
      date,
      room_number,
      site_number,
      customer_name,
      rate_plan_id,
      check_in,
      check_out,
      room_rate,
      pet_fee,
      pet_count,
      extra_charges,
      cash,
      cc,
      note,
      is_refund,
      status,
    } = body;

    // Calculate number of nights from check_in/check_out
    let numNights = 1;
    if (check_in && check_out) {
      const checkInDate = new Date(check_in);
      const checkOutDate = new Date(check_out);
      const diffTime = checkOutDate.getTime() - checkInDate.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      if (diffDays > 0) numNights = diffDays;
    }
    // Allow override from body.num_nights if provided
    if (body.num_nights && body.num_nights > 0) {
      numNights = body.num_nights;
    }

    // Calculate taxes using settings
    let tax_c = 0;
    let tax_s = 0;
    const finalRoomRate = room_rate || await getDefaultRoomRate();
    // For guests: rate is per-night, so multiply by numNights
    // For RV: rate is already the flat total for the duration (weekly/monthly), don't multiply
    const subtotalForNights = entry_type === 'guest' ? finalRoomRate * numNights : finalRoomRate;
    let subtotal = subtotalForNights;
    let total = subtotalForNights;

    if (entry_type === 'guest' && finalRoomRate) {
      tax_c = Math.round(subtotalForNights * cityTaxRate * 100) / 100;
      tax_s = Math.round(subtotalForNights * stateTaxRate * 100) / 100;
      subtotal = Math.round((subtotalForNights + tax_c + tax_s) * 100) / 100;
    }

    // Add pet fees (already multiplied by nights in frontend)
    if (pet_fee && pet_fee > 0) {
      total = subtotal + pet_fee;
    } else {
      total = subtotal;
    }

    // Handle refund
    if (is_refund && body.refund_amount) {
      total = -Math.abs(body.refund_amount);
    }

    const entryData = {
      entry_type,
      date,
      room_number: room_number || null,
      site_number: site_number || null,
      customer_name: customer_name || null,
      rate_plan_id: rate_plan_id || null,
      check_in: check_in || null,
      check_out: check_out || null,
      room_rate: finalRoomRate,
      num_nights: numNights,
      subtotal,
      tax_c,
      tax_s,
      pet_fee: pet_fee || 0,
      pet_count: pet_count || 0,
      extra_charges: extra_charges || [],
      total,
      cash: cash || null,
      cc: cc || null,
      note: note || null,
      is_refund: is_refund || false,
      refund_amount: is_refund ? Math.abs(body.refund_amount || 0) : 0,
      status: status || 'active',
      group_id: body.group_id || null,
      is_group_main: body.is_group_main || false,
    };

    const { data, error } = await supabase
      .from('entries')
      .insert([entryData])
      .select()
      .single();

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json({ error: 'Failed to create entry', details: error }, { status: 500 });
    }

    // Audit log entry creation
    const entrySession = await getCurrentUser();
    if (entrySession) {
      await createAuditLog({
        userId: entrySession.userId,
        username: entrySession.username,
        action: 'create',
        entity_type: 'entry',
        entity_id: data.id,
        details: { entry_type, room_number, site_number, customer_name, total },
      });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error('Error creating entry:', error);
    return NextResponse.json({ error: 'Failed to create entry', details: String(error) }, { status: 500 });
  }
}
