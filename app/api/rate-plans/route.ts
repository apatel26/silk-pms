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

// GET /api/rate-plans - List all rate plans
export async function GET() {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createServerClient();
    const { data, error } = await supabase
      .from('rate_plans')
      .select('*')
      .order('name', { ascending: true });

    if (error) throw error;
    return NextResponse.json(data || []);
  } catch (error) {
    console.error('Error fetching rate plans:', error);
    return NextResponse.json({ error: 'Failed to fetch rate plans' }, { status: 500 });
  }
}

// POST /api/rate-plans - Create new rate plan
export async function POST(request: Request) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, description, base_rate, tax_c_rate, tax_s_rate } = body;

    if (!name || base_rate === undefined) {
      return NextResponse.json({ error: 'Name and base rate required' }, { status: 400 });
    }

    const supabase = createServerClient();

    // Check if name exists
    const { data: existing } = await supabase
      .from('rate_plans')
      .select('id')
      .eq('name', name)
      .single();

    if (existing) {
      return NextResponse.json({ error: 'Rate plan name already exists' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('rate_plans')
      .insert([{
        name,
        description: description || null,
        base_rate: parseFloat(base_rate),
        tax_c_rate: tax_c_rate !== undefined ? parseFloat(tax_c_rate) : 0.07,
        tax_s_rate: tax_s_rate !== undefined ? parseFloat(tax_s_rate) : 0.06,
        is_active: true,
      }])
      .select()
      .single();

    if (error) throw error;

    // Audit log rate plan creation
    await createAuditLog({
      userId: currentUser.userId,
      username: currentUser.username,
      action: 'create',
      entity_type: 'rate_plan',
      entity_id: data.id,
      details: { name, base_rate, tax_c_rate, tax_s_rate },
    });

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error('Error creating rate plan:', error);
    return NextResponse.json({ error: 'Failed to create rate plan' }, { status: 500 });
  }
}