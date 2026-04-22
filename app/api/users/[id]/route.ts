import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { cookies } from 'next/headers';
import { hashPassword } from '@/lib/password';
import { createAuditLog } from '@/lib/audit';

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

type RouteParams = { params: Promise<{ id: string }> };

// PUT /api/users/[id] - Update user (admin only)
export async function PUT(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (currentUser.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const supabase = createServerClient();

    const updateData: any = {};
    if (body.username) updateData.username = body.username;
    if (body.password) updateData.password_hash = hashPassword(body.password);
    if (body.full_name !== undefined) updateData.full_name = body.full_name;
    if (body.photo_url !== undefined) updateData.photo_url = body.photo_url;
    if (body.role) {
      if (!['admin', 'manager', 'staff'].includes(body.role)) {
        return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
      }
      updateData.role = body.role;
    }
    if (body.active !== undefined) updateData.active = body.active;

    const { data, error } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', id)
      .select('id, username, full_name, role, active, created_at, photo_url')
      .single();

    if (error) throw error;

    // Audit log user update
    await createAuditLog({
      userId: currentUser.userId,
      username: currentUser.username,
      action: 'update',
      entity_type: 'user',
      entity_id: id,
      details: updateData,
    });

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error updating user:', error);
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
  }
}

// DELETE /api/users/[id] - Delete user (admin only)
export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (currentUser.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    if (id === currentUser.userId) {
      return NextResponse.json({ error: 'Cannot delete yourself' }, { status: 400 });
    }

    const supabase = createServerClient();
    const { error } = await supabase
      .from('users')
      .delete()
      .eq('id', id);

    if (error) throw error;

    // Audit log user deletion
    await createAuditLog({
      userId: currentUser.userId,
      username: currentUser.username,
      action: 'delete',
      entity_type: 'user',
      entity_id: id,
      details: { deleted_user_id: id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting user:', error);
    return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 });
  }
}
