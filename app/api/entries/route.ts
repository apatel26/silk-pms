import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';

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

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const supabase = createServerClient();

    const {
      entry_type,
      date,
      room_id,
      site_id,
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

    // Calculate taxes for guest rooms
    let tax_c = 0;
    let tax_s = 0;
    let subtotal = room_rate || 0;
    let total = room_rate || 0;

    if (entry_type === 'guest' && room_rate) {
      tax_c = room_rate * 0.07; // 7% city tax
      tax_s = room_rate * 0.06; // 6% state tax
      subtotal = room_rate + tax_c + tax_s;
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
      room_id: room_id || null,
      site_id: site_id || null,
      customer_name: customer_name || null,
      rate_plan_id: rate_plan_id || null,
      check_in: check_in || null,
      check_out: check_out || null,
      room_rate: room_rate || 0,
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
