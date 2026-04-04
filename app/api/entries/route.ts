import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';

function getLastDayOfMonth(year: number, month: number): string {
  const lastDay = new Date(year, month, 0).getDate();
  return `${month.toString().padStart(2, '0')}-${lastDay.toString().padStart(2, '0')}`;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const month = searchParams.get('month'); // YYYY-MM format

    const supabase = createServerClient();

    let query = supabase
      .from('daily_entries')
      .select('*')
      .order('date', { ascending: false })
      .order('room_number', { ascending: true });

    if (month) {
      const [year, monthNum] = month.split('-').map(Number);
      const endDate = `${year}-${getLastDayOfMonth(year, monthNum)}`;
      query = query.gte('date', `${month}-01`).lte('date', endDate);
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

    // Calculate taxes and total
    const rate = body.rate || 0;
    const tax_c = rate * 0.07; // 7%
    const tax_s = rate * 0.06; // 6%
    const total = rate + tax_c + tax_s;

    const entryData = {
      date: body.date,
      room_number: body.room_number,
      name: body.name || null,
      check_in: body.check_in || null,
      check_out: body.check_out || null,
      rate: rate,
      tax_c: tax_c,
      tax_s: tax_s,
      total: total,
      cash: body.cash || null,
      cc: body.cc || null,
      entry_type: body.entry_type || 'guest', // 'guest' or 'rv'
    };

    const { data, error } = await supabase
      .from('daily_entries')
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
