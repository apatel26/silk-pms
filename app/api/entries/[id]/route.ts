import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { cookies } from 'next/headers';
import { createAuditLog } from '@/lib/audit';

export const dynamic = 'force-dynamic';

const AUTH_COOKIE_NAME = 'pms_session';

type RouteParams = { params: Promise<{ id: string }> };

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

// PUT /api/entries/[id] - Update entry
export async function PUT(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

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
      num_nights,
      group_id,
      is_group_main,
    } = body;

    // Calculate number of nights
    let numNights = num_nights || 1;
    if (check_in && check_out && !num_nights) {
      const checkInDate = new Date(check_in);
      const checkOutDate = new Date(check_out);
      const diffTime = checkOutDate.getTime() - checkInDate.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      if (diffDays > 0) numNights = diffDays;
    }

    let tax_c = 0;
    let tax_s = 0;
    const finalRoomRate = room_rate || 0;
    const subtotalForNights = finalRoomRate * numNights;
    let subtotal = subtotalForNights;
    let total = subtotalForNights;

    if (entry_type === 'guest' && finalRoomRate) {
      tax_c = Math.round(subtotalForNights * cityTaxRate * 100) / 100;
      tax_s = Math.round(subtotalForNights * stateTaxRate * 100) / 100;
      subtotal = Math.round((subtotalForNights + tax_c + tax_s) * 100) / 100;
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
      group_id: group_id || null,
      is_group_main: is_group_main || false,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('entries')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    // Audit log entry update
    await createAuditLog({
      userId: currentUser.userId,
      username: currentUser.username,
      action: 'update',
      entity_type: 'entry',
      entity_id: id,
      details: { entry_type, room_number, site_number, customer_name, total },
    });

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error updating entry:', error);
    return NextResponse.json({ error: 'Failed to update entry' }, { status: 500 });
  }
}

// DELETE /api/entries/[id] - Delete entry
export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createServerClient();

    const { error } = await supabase
      .from('entries')
      .delete()
      .eq('id', id);

    if (error) throw error;

    // Audit log entry deletion
    await createAuditLog({
      userId: currentUser.userId,
      username: currentUser.username,
      action: 'delete',
      entity_type: 'entry',
      entity_id: id,
      details: { deleted_entry_id: id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting entry:', error);
    return NextResponse.json({ error: 'Failed to delete entry' }, { status: 500 });
  }
}
