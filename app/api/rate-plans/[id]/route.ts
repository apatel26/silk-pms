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

// PUT /api/rate-plans/[id] - Update rate plan
export async function PUT(request: Request) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'Rate plan ID required' }, { status: 400 });
    }

    const body = await request.json();
    const { name, description, base_rate, tax_c_rate, tax_s_rate, is_active } = body;

    const supabase = createServerClient();

    // Check if name exists for another rate plan
    if (name) {
      const { data: existing } = await supabase
        .from('rate_plans')
        .select('id')
        .eq('name', name)
        .neq('id', id)
        .single();

      if (existing) {
        return NextResponse.json({ error: 'Rate plan name already exists' }, { status: 400 });
      }
    }

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (base_rate !== undefined) updateData.base_rate = parseFloat(base_rate);
    if (tax_c_rate !== undefined) updateData.tax_c_rate = parseFloat(tax_c_rate);
    if (tax_s_rate !== undefined) updateData.tax_s_rate = parseFloat(tax_s_rate);
    if (is_active !== undefined) updateData.is_active = is_active;

    const { data, error } = await supabase
      .from('rate_plans')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error updating rate plan:', error);
    return NextResponse.json({ error: 'Failed to update rate plan' }, { status: 500 });
  }
}

// DELETE /api/rate-plans/[id] - Delete rate plan
export async function DELETE(request: Request) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'Rate plan ID required' }, { status: 400 });
    }

    const supabase = createServerClient();

    // Check if rate plan is in use
    const { data: entriesUsing } = await supabase
      .from('entries')
      .select('id')
      .eq('rate_plan_id', id)
      .limit(1);

    if (entriesUsing && entriesUsing.length > 0) {
      return NextResponse.json({ error: 'Cannot delete rate plan that is assigned to entries' }, { status: 400 });
    }

    const { error } = await supabase
      .from('rate_plans')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting rate plan:', error);
    return NextResponse.json({ error: 'Failed to delete rate plan' }, { status: 500 });
  }
}