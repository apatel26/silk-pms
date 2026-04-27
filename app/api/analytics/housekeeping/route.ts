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

// GET /api/analytics/housekeeping - Get housekeeping stats
export async function GET(request: Request) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('start') || new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0];
    const endDate = searchParams.get('end') || new Date().toISOString().split('T')[0];

    const supabase = createServerClient();

    // Get all housekeeping tasks within date range
    const { data: tasks, error } = await supabase
      .from('housekeeping_tasks')
      .select('*')
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: true });

    if (error) throw error;

    // Calculate daily housekeeping stats
    const statsData: Record<string, { date: string; cleaned: number; dirty: number; occupied: number; skipped: number; total: number }> = {};

    // Initialize all dates in range
    const current = new Date(startDate);
    while (current <= new Date(endDate)) {
      const dateStr = current.toISOString().split('T')[0];
      statsData[dateStr] = {
        date: dateStr,
        cleaned: 0,
        dirty: 0,
        occupied: 0,
        skipped: 0,
        total: 0,
      };
      current.setDate(current.getDate() + 1);
    }

    // Aggregate housekeeping by date and status
    for (const task of tasks || []) {
      const dateStr = task.date;
      if (!statsData[dateStr]) {
        statsData[dateStr] = { date: dateStr, cleaned: 0, dirty: 0, occupied: 0, skipped: 0, total: 0 };
      }

      statsData[dateStr].total++;
      switch (task.status) {
        case 'cleaned':
          statsData[dateStr].cleaned++;
          break;
        case 'dirty':
          statsData[dateStr].dirty++;
          break;
        case 'occupied':
          statsData[dateStr].occupied++;
          break;
        case 'skip':
          statsData[dateStr].skipped++;
          break;
      }
    }

    // Convert to array and calculate completion rate
    const result = Object.values(statsData).map(day => ({
      ...day,
      completionRate: day.total > 0 ? Math.round((day.cleaned / day.total) * 100) : 0,
    }));

    // Calculate summary stats
    const totalCleaned = result.reduce((sum, d) => sum + d.cleaned, 0);
    const totalDirty = result.reduce((sum, d) => sum + d.dirty, 0);
    const totalOccupied = result.reduce((sum, d) => sum + d.occupied, 0);
    const totalSkipped = result.reduce((sum, d) => sum + d.skipped, 0);
    const totalTasks = result.reduce((sum, d) => sum + d.total, 0);
    const avgCompletionRate = totalTasks > 0 ? Math.round((totalCleaned / totalTasks) * 100) : 0;

    return NextResponse.json({
      data: result,
      summary: {
        totalCleaned,
        totalDirty,
        totalOccupied,
        totalSkipped,
        totalTasks,
        avgCompletionRate,
        totalDays: result.length,
      },
    });
  } catch (error) {
    console.error('Error fetching housekeeping stats:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}