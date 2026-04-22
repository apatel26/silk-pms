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
      id: null,
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

// POST /api/settings - Save property settings
export async function POST(request: Request) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const supabase = createServerClient();

    // First, get the existing settings row
    const { data: existing, error: fetchError } = await supabase
      .from('property_settings')
      .select('id')
      .limit(1);

    if (fetchError) {
      console.error('Fetch error:', fetchError);
      return NextResponse.json({ error: 'Fetch error: ' + fetchError.message }, { status: 500 });
    }

    // Parse and round tax rates to avoid floating point issues
    const cityTaxRate = parseFloat(body.city_tax_rate);
    const stateTaxRate = parseFloat(body.state_tax_rate);

    const updateData = {
      name: body.name || 'American Inn and RV Park',
      address: body.address || '',
      phone: body.phone || '',
      city_tax_rate: isNaN(cityTaxRate) ? 0.07 : Math.round(cityTaxRate * 10000) / 10000,
      state_tax_rate: isNaN(stateTaxRate) ? 0.06 : Math.round(stateTaxRate * 10000) / 10000,
      default_room_rate: parseFloat(body.default_room_rate) || 70.00,
      default_pet_fee: parseFloat(body.default_pet_fee) || 20.00,
      weekly_30amp: parseFloat(body.weekly_30amp) || 200.00,
      weekly_50amp: parseFloat(body.weekly_50amp) || 230.00,
      monthly_30amp: parseFloat(body.monthly_30amp) || 400.00,
      monthly_50amp: parseFloat(body.monthly_50amp) || 500.00,
      logo_url: body.logo_url || null,
      updated_at: new Date().toISOString(),
    };

    let result;

    if (existing && existing.length > 0) {
      // Update existing row by id
      const { data, error } = await supabase
        .from('property_settings')
        .update(updateData)
        .eq('id', existing[0].id)
        .select()
        .single();
      result = { data, error };
    } else {
      // No existing row, insert new one
      const { data, error } = await supabase
        .from('property_settings')
        .insert([updateData])
        .select()
        .single();
      result = { data, error };
    }

    if (result.error) {
      console.error('Save error:', result.error);
      return NextResponse.json({ error: 'Save error: ' + result.error.message, code: result.error.code }, { status: 500 });
    }

    // Audit log settings update
    const sessionUser = await getCurrentUser();
    if (sessionUser) {
      await createAuditLog({
        userId: sessionUser.userId,
        username: sessionUser.username,
        action: 'update',
        entity_type: 'settings',
        entity_id: result.data?.id || null,
        details: { name: body.name, city_tax_rate: body.city_tax_rate, state_tax_rate: body.state_tax_rate },
      });
    }

    return NextResponse.json({ success: true, data: result.data });
  } catch (error) {
    console.error('Error saving settings:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
