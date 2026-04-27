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

// GET /api/analytics/revenue - Get revenue data
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

    // Get all entries within date range
    const { data: entries, error } = await supabase
      .from('entries')
      .select('*')
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: true });

    if (error) throw error;

    // Calculate daily revenue
    const revenueData: Record<string, { date: string; guestRevenue: number; rvRevenue: number; totalRevenue: number; cityTax: number; stateTax: number; cash: number; cc: number; refunds: number; entryCount: number }> = {};

    // Initialize all dates in range
    const current = new Date(startDate);
    while (current <= new Date(endDate)) {
      const dateStr = current.toISOString().split('T')[0];
      revenueData[dateStr] = {
        date: dateStr,
        guestRevenue: 0,
        rvRevenue: 0,
        totalRevenue: 0,
        cityTax: 0,
        stateTax: 0,
        cash: 0,
        cc: 0,
        refunds: 0,
        entryCount: 0,
      };
      current.setDate(current.getDate() + 1);
    }

    // Aggregate revenue by date
    for (const entry of entries || []) {
      const dateStr = entry.date;
      if (!revenueData[dateStr]) {
        revenueData[dateStr] = {
          date: dateStr,
          guestRevenue: 0,
          rvRevenue: 0,
          totalRevenue: 0,
          cityTax: 0,
          stateTax: 0,
          cash: 0,
          cc: 0,
          refunds: 0,
          entryCount: 0,
        };
      }

      if (entry.entry_type === 'guest') {
        revenueData[dateStr].guestRevenue += entry.subtotal || 0;
      } else if (entry.entry_type === 'rv') {
        revenueData[dateStr].rvRevenue += entry.subtotal || 0;
      }

      revenueData[dateStr].totalRevenue += entry.total || 0;
      revenueData[dateStr].cityTax += entry.tax_c || 0;
      revenueData[dateStr].stateTax += entry.tax_s || 0;
      revenueData[dateStr].cash += entry.cash || 0;
      revenueData[dateStr].cc += entry.cc || 0;
      revenueData[dateStr].refunds += entry.is_refund ? (entry.refund_amount || 0) : 0;
      revenueData[dateStr].entryCount++;
    }

    // Convert to array
    const result = Object.values(revenueData);

    // Calculate summary stats
    const totalGuestRevenue = result.reduce((sum, d) => sum + d.guestRevenue, 0);
    const totalRvRevenue = result.reduce((sum, d) => sum + d.rvRevenue, 0);
    const totalRevenue = result.reduce((sum, d) => sum + d.totalRevenue, 0);
    const totalCityTax = result.reduce((sum, d) => sum + d.cityTax, 0);
    const totalStateTax = result.reduce((sum, d) => sum + d.stateTax, 0);
    const totalCash = result.reduce((sum, d) => sum + d.cash, 0);
    const totalCc = result.reduce((sum, d) => sum + d.cc, 0);
    const totalRefunds = result.reduce((sum, d) => sum + d.refunds, 0);

    return NextResponse.json({
      data: result,
      summary: {
        totalGuestRevenue: Math.round(totalGuestRevenue * 100) / 100,
        totalRvRevenue: Math.round(totalRvRevenue * 100) / 100,
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        totalCityTax: Math.round(totalCityTax * 100) / 100,
        totalStateTax: Math.round(totalStateTax * 100) / 100,
        totalCash: Math.round(totalCash * 100) / 100,
        totalCc: Math.round(totalCc * 100) / 100,
        totalRefunds: Math.round(totalRefunds * 100) / 100,
        netRevenue: Math.round((totalRevenue - totalRefunds) * 100) / 100,
        totalEntries: result.reduce((sum, d) => sum + d.entryCount, 0),
      },
    });
  } catch (error) {
    console.error('Error fetching revenue:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}