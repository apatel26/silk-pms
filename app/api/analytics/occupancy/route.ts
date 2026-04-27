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

// GET /api/analytics/occupancy - Get occupancy data
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

    // Get all active entries within date range
    const { data: entries, error } = await supabase
      .from('entries')
      .select('*')
      .eq('status', 'active')
      .or(`check_in.lte.${endDate},check_out.gte.${startDate}`);

    if (error) throw error;

    // Get room count from property_settings (or use default)
    const totalRooms = 24; // 101-112 and 201-212
    const totalSites = 15; // RV sites 1-15

    // Calculate daily occupancy
    const occupancyData: Record<string, { date: string; occupiedRooms: number; totalRooms: number; occupiedSites: number; totalSites: number }> = {};

    // Initialize all dates in range
    const current = new Date(startDate);
    while (current <= new Date(endDate)) {
      const dateStr = current.toISOString().split('T')[0];
      occupancyData[dateStr] = {
        date: dateStr,
        occupiedRooms: 0,
        totalRooms,
        occupiedSites: 0,
        totalSites,
      };
      current.setDate(current.getDate() + 1);
    }

    // Count occupied rooms/sites for each day
    for (const entry of entries || []) {
      const checkIn = entry.check_in;
      const checkOut = entry.check_out;

      if (!checkIn || !checkOut) continue;

      const entryDate = new Date(entry.date);
      const ci = new Date(checkIn);
      const co = new Date(checkOut);

      // Check which days this entry covers
      for (const dateStr of Object.keys(occupancyData)) {
        const d = new Date(dateStr);
        if (d >= ci && d <= co) {
          if (entry.entry_type === 'guest' && entry.room_number) {
            occupancyData[dateStr].occupiedRooms++;
          } else if (entry.entry_type === 'rv' && entry.site_number) {
            occupancyData[dateStr].occupiedSites++;
          }
        }
      }
    }

    // Convert to array and add occupancy rate
    const result = Object.values(occupancyData).map(day => ({
      ...day,
      roomOccupancyRate: Math.round((day.occupiedRooms / day.totalRooms) * 100),
      siteOccupancyRate: Math.round((day.occupiedSites / day.totalSites) * 100),
    }));

    // Sort by date
    result.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Calculate summary stats
    const avgRoomOccupancy = result.length > 0
      ? Math.round(result.reduce((sum, d) => sum + d.roomOccupancyRate, 0) / result.length)
      : 0;
    const avgSiteOccupancy = result.length > 0
      ? Math.round(result.reduce((sum, d) => sum + d.siteOccupancyRate, 0) / result.length)
      : 0;

    return NextResponse.json({
      data: result,
      summary: {
        avgRoomOccupancy,
        avgSiteOccupancy,
        totalDays: result.length,
        occupiedRoomDays: result.reduce((sum, d) => sum + d.occupiedRooms, 0),
        occupiedSiteDays: result.reduce((sum, d) => sum + d.occupiedSites, 0),
      },
    });
  } catch (error) {
    console.error('Error fetching occupancy:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}