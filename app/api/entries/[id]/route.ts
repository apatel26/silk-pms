import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';

export async function PUT(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Entry ID required' }, { status: 400 });
    }

    const body = await request.json();
    const supabase = createServerClient();

    // Recalculate taxes
    const rate = body.rate || 0;
    const tax_c = rate * 0.07;
    const tax_s = rate * 0.06;
    const total = rate + tax_c + tax_s;

    const updateData = {
      date: body.date,
      room_number: body.room_number,
      entry_type: body.entry_type,
      name: body.name || null,
      check_in: body.check_in || null,
      check_out: body.check_out || null,
      rate: rate,
      tax_c: tax_c,
      tax_s: tax_s,
      total: total,
      cash: body.cash,
      cc: body.cc,
      note: body.note || null,
    };

    const { data, error } = await supabase
      .from('daily_entries')
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

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Entry ID required' }, { status: 400 });
    }

    const supabase = createServerClient();

    const { error } = await supabase.from('daily_entries').delete().eq('id', id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting entry:', error);
    return NextResponse.json({ error: 'Failed to delete entry' }, { status: 500 });
  }
}
