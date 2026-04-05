import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';

type RouteParams = { params: Promise<{ id: string }> };

export async function PUT(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
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

    let tax_c = 0;
    let tax_s = 0;
    let subtotal = room_rate || 0;
    let total = room_rate || 0;

    if (entry_type === 'guest' && room_rate) {
      tax_c = room_rate * 0.07;
      tax_s = room_rate * 0.06;
      subtotal = room_rate + tax_c + tax_s;
    }

    if (pet_fee && pet_fee > 0) {
      total = subtotal + pet_fee;
    } else {
      total = subtotal;
    }

    if (is_refund && body.refund_amount) {
      total = -Math.abs(body.refund_amount);
    }

    const updateData: any = {
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
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('entries')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error updating entry:', error);
    return NextResponse.json({ error: 'Failed to update entry' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const supabase = createServerClient();

    const { error } = await supabase
      .from('entries')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting entry:', error);
    return NextResponse.json({ error: 'Failed to delete entry' }, { status: 500 });
  }
}
