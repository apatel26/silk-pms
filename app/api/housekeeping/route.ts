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

// GET /api/housekeeping - Get housekeeping tasks for a date
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');

    const supabase = createServerClient();

    if (date) {
      // Get tasks for specific date
      const { data, error } = await supabase
        .from('housekeeping_tasks')
        .select('*')
        .eq('date', date)
        .order('room_number');

      if (error) throw error;
      return NextResponse.json(data || []);
    } else {
      // Get all recent tasks
      const { data, error } = await supabase
        .from('housekeeping_tasks')
        .select('*')
        .order('date', { ascending: false })
        .limit(100);

      if (error) throw error;
      return NextResponse.json(data || []);
    }
  } catch (error) {
    console.error('Error fetching housekeeping tasks:', error);
    return NextResponse.json({ error: 'Failed to fetch tasks' }, { status: 500 });
  }
}

// POST /api/housekeeping - Create or update housekeeping tasks
export async function POST(request: Request) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { date, tasks } = body;
    const supabase = createServerClient();

    if (tasks && Array.isArray(tasks)) {
      // Bulk update tasks
      const results = [];
      for (const task of tasks) {
        if (task.id) {
          // Update existing
          const { data, error } = await supabase
            .from('housekeeping_tasks')
            .update({
              status: task.status,
              notes: task.notes || null,
              assigned_to: task.assigned_to || null,
              updated_at: new Date().toISOString(),
            })
            .eq('id', task.id)
            .select()
            .single();

          if (error) throw error;
          results.push(data);

          // Audit log task update
          await createAuditLog({
            userId: currentUser.userId,
            username: currentUser.username,
            action: 'update',
            entity_type: 'housekeeping',
            entity_id: data.id,
            details: { room_number: data.room_number, status: data.status },
          });
        }
      }
      return NextResponse.json(results);
    } else {
      // Create single task
      const { data, error } = await supabase
        .from('housekeeping_tasks')
        .insert([{
          date,
          room_number: body.room_number,
          room_id: body.room_id || null,
          status: body.status || 'pending',
          notes: body.notes || null,
          assigned_to: body.assigned_to || null,
        }])
        .select()
        .single();

      if (error) throw error;
      return NextResponse.json(data, { status: 201 });
    }
  } catch (error) {
    console.error('Error saving housekeeping task:', error);
    return NextResponse.json({ error: 'Failed to save task' }, { status: 500 });
  }
}

// PUT /api/housekeeping - Update task status
export async function PUT(request: Request) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { id, status, notes } = body;
    const supabase = createServerClient();

    const { data, error } = await supabase
      .from('housekeeping_tasks')
      .update({
        status,
        notes: notes || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Housekeeping update error:', error);
      return NextResponse.json({ error: 'Update failed: ' + error.message }, { status: 500 });
    }

    // Audit log housekeeping task update
    await createAuditLog({
      userId: currentUser.userId,
      username: currentUser.username,
      action: 'update',
      entity_type: 'housekeeping',
      entity_id: id,
      details: { status, notes },
    });

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error updating housekeeping task:', error);
    return NextResponse.json({ error: 'Failed to update task' }, { status: 500 });
  }
}
