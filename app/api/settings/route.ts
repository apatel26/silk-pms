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

// GET /api/settings - Get property settings
export async function GET() {
  try {
    const supabase = createServerClient();

    const { data, error } = await supabase
      .from('property_settings')
      .select('*')
      .limit(1);

    if (error) {
      console.error('Error fetching settings:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const settings = data && data.length > 0 ? data[0] : null;

    return NextResponse.json(settings || {
      name: 'American Inn and RV Park',
      address: '',
      phone: '',
      city_tax_rate: 0.07,
      state_tax_rate: 0.06,
      default_room_rate: 70.00,
      default_pet_fee: 20.00,
      weekly_30amp: 200.00,
      weekly_50amp: 230.00,
      monthly_30amp: 400.00,
      monthly_50amp: 500.00,
    });
  } catch (error) {
    console.error('Error fetching settings:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

// PUT /api/settings - Update property settings
export async function PUT(request: Request) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const supabase = createServerClient();

    // First try to get existing settings
    const { data: existing, error: fetchError } = await supabase
      .from('property_settings')
      .select('id')
      .limit(1);

    if (fetchError) {
      console.error('Fetch existing error:', fetchError);
      return NextResponse.json({ error: 'Fetch error: ' + fetchError.message }, { status: 500 });
    }

    const updateData = {
      name: body.name,
      address: body.address || '',
      phone: body.phone || '',
      city_tax_rate: body.city_tax_rate || 0.07,
      state_tax_rate: body.state_tax_rate || 0.06,
      default_room_rate: body.default_room_rate || 70.00,
      default_pet_fee: body.default_pet_fee || 20.00,
      weekly_30amp: body.weekly_30amp || 200.00,
      weekly_50amp: body.weekly_50amp || 230.00,
      monthly_30amp: body.monthly_30amp || 400.00,
      monthly_50amp: body.monthly_50amp || 500.00,
      updated_at: new Date().toISOString(),
    };

    let result;
    if (existing && existing.length > 0) {
      // Update existing
      const { data, error } = await supabase
        .from('property_settings')
        .update(updateData)
        .eq('id', existing[0].id)
        .select()
        .single();
      result = { data, error };
    } else {
      // Insert new
      const { data, error } = await supabase
        .from('property_settings')
        .insert([updateData])
        .select()
        .single();
      result = { data, error };
    }

    if (result.error) {
      console.error('Save error:', result.error);
      return NextResponse.json({ error: 'Save error: ' + result.error.message }, { status: 500 });
    }

    return NextResponse.json(result.data);
  } catch (error) {
    console.error('Error saving settings:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
