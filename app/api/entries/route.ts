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

    const supabase = createServerClient();

    let query = supabase
      .from('entries')
      .select('*')
      .order('created_at', { ascending: false });

    if (date) {
      query = query.eq('date', date);
    } else if (month) {
      query = query.like('date', `${month}%`);
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

    // Calculate taxes using settings
    let tax_c = 0;
    let tax_s = 0;
    const finalRoomRate = room_rate || await getDefaultRoomRate();
    let subtotal = finalRoomRate;
    let total = finalRoomRate;

    if (entry_type === 'guest' && finalRoomRate) {
      tax_c = Math.round(finalRoomRate * cityTaxRate * 100) / 100;
      tax_s = Math.round(finalRoomRate * stateTaxRate * 100) / 100;
      subtotal = Math.round((finalRoomRate + tax_c + tax_s) * 100) / 100;
    }

    // Add pet fees
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
      tax_c,
      tax_s,
      pet_fee: pet_fee || 0,
      pet_count: pet_count || 0,
      extra_charges: extra_charges || [],
      subtotal,
      total,
      cash: cash || null,
      cc: cc || null,
      note: note || null,
      is_refund: is_refund || false,
      refund_amount: is_refund ? Math.abs(body.refund_amount || 0) : 0,
      status: status || 'active',
    };

    const { data, error } = await supabase
      .from('entries')
      .insert([entryData])
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error('Error creating entry:', error);
    return NextResponse.json({ error: 'Failed to create entry' }, { status: 500 });
  }
}
