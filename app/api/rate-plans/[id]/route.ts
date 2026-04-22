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

// PUT /api/rate-plans/[id] - Update rate plan
export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
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

    // Audit log rate plan update
    await createAuditLog({
      userId: currentUser.userId,
      username: currentUser.username,
      action: 'update',
      entity_type: 'rate_plan',
      entity_id: id,
      details: updateData,
    });

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error updating rate plan:', error);
    return NextResponse.json({ error: 'Failed to update rate plan' }, { status: 500 });
  }
}

// DELETE /api/rate-plans/[id] - Delete rate plan
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
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

    // Audit log rate plan deletion
    await createAuditLog({
      userId: currentUser.userId,
      username: currentUser.username,
      action: 'delete',
      entity_type: 'rate_plan',
      entity_id: id,
      details: { deleted_rate_plan_id: id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting rate plan:', error);
    return NextResponse.json({ error: 'Failed to delete rate plan' }, { status: 500 });
  }
}