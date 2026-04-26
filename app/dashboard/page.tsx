'use client';

// Preview mode test - can be removed after verification
import { useEffect, useState } from 'react';
import Link from 'next/link';
import dayjs from 'dayjs';

interface Entry {
  id: string;
  entry_type: 'guest' | 'rv';
  date: string;
  room_number: string | null;
  site_number: string | null;
  customer_name: string;
  check_in: string | null;
  check_out: string | null;
  total: number;
  status: string;
}

interface DashboardStats {
  todayGuests: number;
  todayRV: number;
  todayTotal: number;
  monthTotal: number;
  pendingCheckouts: number;
  occupiedRooms: number;
  occupiedSites: number;
}

const GUEST_ROOMS = [101, 102, 103, 104, 105, 106, 107, 108, 109, 110, 111, 112, 201, 202, 203, 204, 205, 206, 207, 208, 209, 210, 211, 212];
const RV_SITES = Array.from({ length: 15 }, (_, i) => i + 1);

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats>({
    todayGuests: 0,
    todayRV: 0,
    todayTotal: 0,
    monthTotal: 0,
    pendingCheckouts: 0,
    occupiedRooms: 0,
    occupiedSites: 0,
  });
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(dayjs());
  const [entries, setEntries] = useState<Entry[]>([]);
  const [calendarView, setCalendarView] = useState<'month' | 'week'>('month');

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const today = dayjs().format('YYYY-MM-DD');
      const month = dayjs().format('YYYY-MM');

      // Fetch today's entries
      const todayRes = await fetch(`/api/entries?date=${today}`);
      const todayData = todayRes.ok ? await todayRes.json() : [];

      // Fetch month's entries
      const monthRes = await fetch(`/api/entries?month=${month}`);
      const monthData = monthRes.ok ? await monthRes.json() : [];

      // Fetch for calendar view
      const monthStart = dayjs().startOf('month').format('YYYY-MM-DD');
      const monthEnd = dayjs().endOf('month').format('YYYY-MM-DD');
      const calendarRes = await fetch(`/api/entries?month=${dayjs().format('YYYY-MM')}`);
      const calendarData = calendarRes.ok ? await calendarRes.json() : [];

      const guestEntries = todayData.filter((e: Entry) => e.entry_type === 'guest' && e.status === 'active');
      const rvEntries = todayData.filter((e: Entry) => e.entry_type === 'rv' && e.status === 'active');

      setStats({
        todayGuests: guestEntries.length,
        todayRV: rvEntries.length,
        todayTotal: todayData.reduce((sum: number, e: Entry) => sum + (e.total || 0), 0),
        monthTotal: monthData.reduce((sum: number, e: Entry) => sum + (e.total || 0), 0),
        pendingCheckouts: todayData.filter((e: Entry) => e.status === 'checked_out').length,
        occupiedRooms: guestEntries.length,
        occupiedSites: rvEntries.length,
      });

      setEntries(calendarData || []);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getEntriesForDate = (date: dayjs.Dayjs) => {
    const dateStr = date.format('YYYY-MM-DD');
    return entries.filter((e: Entry) => {
      const checkIn = dayjs(e.check_in);
      const checkOut = dayjs(e.check_out);
      return dateStr >= checkIn.format('YYYY-MM-DD') && dateStr <= checkOut.format('YYYY-MM-DD') && e.status === 'active';
    });
  };

  const getRoomStatus = (roomNum: number) => {
    const dateEntries = getEntriesForDate(selectedDate);
    const entry = dateEntries.find((e: Entry) => e.room_number === String(roomNum));
    return entry ? 'occupied' : 'available';
  };

  const getSiteStatus = (siteNum: number) => {
    const dateEntries = getEntriesForDate(selectedDate);
    const entry = dateEntries.find((e: Entry) => e.site_number === String(siteNum) && e.entry_type === 'rv');
    return entry ? 'occupied' : 'available';
  };

  const getDaysInMonth = () => {
    const start = selectedDate.startOf('month');
    const end = selectedDate.endOf('month');
    const days: dayjs.Dayjs[] = [];
    let day = start;
    while (day.isBefore(end) || day.isSame(end, 'day')) {
      days.push(day);
      day = day.add(1, 'day');
    }
    return days;
  };

  const getWeekDays = () => {
    const start = selectedDate.startOf('week');
    const days: dayjs.Dayjs[] = [];
    for (let i = 0; i < 7; i++) {
      days.push(start.add(i, 'day'));
    }
    return days;
  };

  const navigateMonth = (direction: number) => {
    setSelectedDate(selectedDate.add(direction, 'month'));
  };

  const navigateWeek = (direction: number) => {
    setSelectedDate(selectedDate.add(direction, 'week'));
  };

  const getOccupancyRate = () => {
    const totalUnits = GUEST_ROOMS.length + RV_SITES.length;
    const occupied = stats.occupiedRooms + stats.occupiedSites;
    return totalUnits > 0 ? Math.round((occupied / totalUnits) * 100) : 0;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-slate-400">Loading...</div>
      </div>
    );
  }

  const daysInMonth = getDaysInMonth();
  const weekDays = getWeekDays();
  const firstDayOffset = daysInMonth[0].day();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Dashboard</h1>
          <p className="text-slate-400">{dayjs().format('dddd, MMMM D, YYYY')}</p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/entries"
            className="px-4 py-2 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 text-slate-900 font-semibold hover:from-amber-400 hover:to-amber-500 transition"
          >
            + Add Entry
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900 rounded-xl p-6 border border-slate-800">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-slate-400">Today's Revenue</p>
            <span className="text-amber-400">$</span>
          </div>
          <p className="text-3xl font-bold text-white">${stats.todayTotal.toFixed(2)}</p>
        </div>

        <div className="bg-slate-900 rounded-xl p-6 border border-slate-800">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-slate-400">This Month</p>
            <span className="text-amber-400">$</span>
          </div>
          <p className="text-3xl font-bold text-white">${stats.monthTotal.toFixed(2)}</p>
        </div>

        <div className="bg-slate-900 rounded-xl p-6 border border-slate-800">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-slate-400">Occupancy</p>
            <span className="text-green-400">{getOccupancyRate()}%</span>
          </div>
          <p className="text-3xl font-bold text-white">{stats.occupiedRooms + stats.occupiedSites}</p>
          <p className="text-xs text-slate-500 mt-1">of {GUEST_ROOMS.length + RV_SITES.length} units</p>
        </div>

        <div className="bg-slate-900 rounded-xl p-6 border border-slate-800">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-slate-400">Active Guests</p>
            <span className="text-blue-400">🚐</span>
          </div>
          <p className="text-3xl font-bold text-white">{stats.todayGuests + stats.todayRV}</p>
          <p className="text-xs text-slate-500 mt-1">{stats.todayGuests} rooms, {stats.todayRV} RV</p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Link
          href="/dashboard/entries"
          className="flex items-center gap-4 p-4 rounded-xl bg-gradient-to-r from-amber-500/20 to-amber-600/10 border border-amber-500/20 hover:from-amber-500/30 hover:to-amber-600/20 transition"
        >
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center">
            <svg className="w-5 h-5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
          </div>
          <div>
            <p className="font-semibold text-white">Add Entry</p>
            <p className="text-xs text-slate-400">New guest or RV</p>
          </div>
        </Link>

        <Link
          href="/dashboard/reports"
          className="flex items-center gap-4 p-4 rounded-xl bg-gradient-to-r from-green-500/20 to-green-600/10 border border-green-500/20 hover:from-green-500/30 hover:to-green-600/20 transition"
        >
          <div className="w-10 h-10 rounded-xl bg-green-500/20 flex items-center justify-center">
            <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <div>
            <p className="font-semibold text-white">Reports</p>
            <p className="text-xs text-slate-400">Export Excel/PDF</p>
          </div>
        </Link>

        <Link
          href="/dashboard/housekeeping"
          className="flex items-center gap-4 p-4 rounded-xl bg-gradient-to-r from-blue-500/20 to-blue-600/10 border border-blue-500/20 hover:from-blue-500/30 hover:to-blue-600/20 transition"
        >
          <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
            <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
          </div>
          <div>
            <p className="font-semibold text-white">Housekeeping</p>
            <p className="text-xs text-slate-400">Cleaning schedule</p>
          </div>
        </Link>

        <Link
          href="/dashboard/settings"
          className="flex items-center gap-4 p-4 rounded-xl bg-gradient-to-r from-purple-500/20 to-purple-600/10 border border-purple-500/20 hover:from-purple-500/30 hover:to-purple-600/20 transition"
        >
          <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
            <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <div>
            <p className="font-semibold text-white">Settings</p>
            <p className="text-xs text-slate-400">Configure PMS</p>
          </div>
        </Link>
      </div>

      {/* Calendar View */}
      <div className="bg-slate-900 rounded-xl p-6 border border-slate-800">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-white">Booking Calendar</h3>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCalendarView('month')}
              className={`px-3 py-1 rounded text-sm font-medium transition ${
                calendarView === 'month'
                  ? 'bg-amber-500/10 text-amber-400'
                  : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              Month
            </button>
            <button
              onClick={() => setCalendarView('week')}
              className={`px-3 py-1 rounded text-sm font-medium transition ${
                calendarView === 'week'
                  ? 'bg-amber-500/10 text-amber-400'
                  : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              Week
            </button>
          </div>
        </div>

        {/* Calendar Navigation */}
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => calendarView === 'month' ? navigateMonth(-1) : navigateWeek(-1)}
            className="p-2 rounded-lg bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h4 className="text-white font-semibold">
            {calendarView === 'month'
              ? selectedDate.format('MMMM YYYY')
              : `Week of ${selectedDate.startOf('week').format('MMM D')} - ${selectedDate.endOf('week').format('MMM D, YYYY')}`}
          </h4>
          <button
            onClick={() => calendarView === 'month' ? navigateMonth(1) : navigateWeek(1)}
            className="p-2 rounded-lg bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        {/* Today Button */}
        <button
          onClick={() => setSelectedDate(dayjs())}
          className="mb-4 px-3 py-1 rounded bg-amber-500/10 text-amber-400 text-sm hover:bg-amber-500/20"
        >
          Today
        </button>

        {/* Room Availability Grid */}
        <div className="mb-6">
          <h5 className="text-sm font-medium text-slate-400 mb-3">Room Availability (as of {selectedDate.format('MMM D, YYYY')})</h5>
          <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-12 gap-2">
            {GUEST_ROOMS.map((roomNum) => {
              const status = getRoomStatus(roomNum);
              const entry = getEntriesForDate(selectedDate).find((e: Entry) => e.room_number === String(roomNum));
              return (
                <div
                  key={`room-${roomNum}`}
                  className={`relative p-2 rounded-lg border text-center ${
                    status === 'occupied'
                      ? 'bg-amber-500/20 border-amber-500/40'
                      : 'bg-slate-800 border-slate-700'
                  }`}
                >
                  <p className={`text-sm font-bold ${status === 'occupied' ? 'text-amber-400' : 'text-slate-400'}`}>
                    {roomNum}
                  </p>
                  {entry && (
                    <p className="text-xs text-white truncate mt-1" title={entry.customer_name}>
                      {entry.customer_name?.substring(0, 6) || 'Guest'}
                    </p>
                  )}
                  {status === 'available' && (
                    <p className="text-xs text-slate-500">Vacant</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* RV Site Availability Grid */}
        <div>
          <h5 className="text-sm font-medium text-slate-400 mb-3">RV Site Availability</h5>
          <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-10 lg:grid-cols-15 gap-2">
            {RV_SITES.map((siteNum) => {
              const status = getSiteStatus(siteNum);
              const entry = getEntriesForDate(selectedDate).find((e: Entry) => e.site_number === String(siteNum));
              return (
                <div
                  key={`site-${siteNum}`}
                  className={`relative p-2 rounded-lg border text-center ${
                    status === 'occupied'
                      ? 'bg-blue-500/20 border-blue-500/40'
                      : 'bg-slate-800 border-slate-700'
                  }`}
                >
                  <p className={`text-xs font-bold ${status === 'occupied' ? 'text-blue-400' : 'text-slate-400'}`}>
                    RV{siteNum}
                  </p>
                  {entry && (
                    <p className="text-xs text-white truncate mt-0.5" title={entry.customer_name}>
                      {entry.customer_name?.substring(0, 5) || 'Guest'}
                    </p>
                  )}
                  {status === 'available' && (
                    <p className="text-xs text-slate-500">Open</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 mt-6 pt-4 border-t border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-amber-500/20 border border-amber-500/40"></div>
            <span className="text-xs text-slate-400">Occupied Room</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-blue-500/20 border border-blue-500/40"></div>
            <span className="text-xs text-slate-400">Occupied RV Site</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-slate-800 border border-slate-700"></div>
            <span className="text-xs text-slate-400">Available</span>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Quick Tips */}
        <div className="bg-slate-900 rounded-xl p-6 border border-slate-800">
          <h3 className="text-lg font-semibold text-white mb-4">Quick Tips</h3>
          <ul className="space-y-3 text-sm text-slate-400">
            <li className="flex items-start gap-2">
              <span className="text-amber-400">•</span>
              Click on any room in Daily Entry to add or edit an entry
            </li>
            <li className="flex items-start gap-2">
              <span className="text-amber-400">•</span>
              Use the date picker to enter past entries for catch-up
            </li>
            <li className="flex items-start gap-2">
              <span className="text-amber-400">•</span>
              Export reports monthly to send to your accountant
            </li>
            <li className="flex items-start gap-2">
              <span className="text-amber-400">•</span>
              Don&apos;t forget to checkout guests when they leave
            </li>
          </ul>
        </div>

        {/* Support */}
        <div className="bg-slate-900 rounded-xl p-6 border border-slate-800">
          <h3 className="text-lg font-semibold text-white mb-4">Silk PMS</h3>
          <p className="text-sm text-slate-400 mb-4">
            Your property management system for American Inn and RV Park.
          </p>
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <span>Powered by</span>
            <span className="text-amber-400 font-medium">Silk PMS</span>
          </div>
        </div>
      </div>
    </div>
  );
}