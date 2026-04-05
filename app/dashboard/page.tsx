'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import dayjs from 'dayjs';

interface Entry {
  id: string;
  entry_type: 'guest' | 'rv';
  date: string;
  total: number;
  status: string;
}

interface DashboardStats {
  todayGuests: number;
  todayRV: number;
  todayTotal: number;
  monthTotal: number;
  pendingCheckouts: number;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats>({
    todayGuests: 0,
    todayRV: 0,
    todayTotal: 0,
    monthTotal: 0,
    pendingCheckouts: 0,
  });
  const [loading, setLoading] = useState(true);

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

      const guestEntries = todayData.filter((e: Entry) => e.entry_type === 'guest' && e.status === 'active');
      const rvEntries = todayData.filter((e: Entry) => e.entry_type === 'rv' && e.status === 'active');

      setStats({
        todayGuests: guestEntries.length,
        todayRV: rvEntries.length,
        todayTotal: todayData.reduce((sum: number, e: Entry) => sum + (e.total || 0), 0),
        monthTotal: monthData.reduce((sum: number, e: Entry) => sum + (e.total || 0), 0),
        pendingCheckouts: todayData.filter((e: Entry) => e.status === 'checked_out').length,
      });
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-slate-400">Loading...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Welcome back</h1>
        <p className="text-slate-400">{dayjs().format('dddd, MMMM D, YYYY')}</p>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Link
          href="/dashboard/entries"
          className="flex items-center gap-4 p-6 rounded-xl bg-gradient-to-r from-amber-500/20 to-amber-600/10 border border-amber-500/20 hover:from-amber-500/30 hover:to-amber-600/20 transition"
        >
          <div className="w-12 h-12 rounded-xl bg-amber-500/20 flex items-center justify-center">
            <svg className="w-6 h-6 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
          </div>
          <div>
            <p className="font-semibold text-white">Add Entry</p>
            <p className="text-sm text-slate-400">New guest or RV</p>
          </div>
        </Link>

        <Link
          href="/dashboard/reports"
          className="flex items-center gap-4 p-6 rounded-xl bg-gradient-to-r from-green-500/20 to-green-600/10 border border-green-500/20 hover:from-green-500/30 hover:to-green-600/20 transition"
        >
          <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center">
            <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <div>
            <p className="font-semibold text-white">Reports</p>
            <p className="text-sm text-slate-400">Export Excel/PDF</p>
          </div>
        </Link>

        <Link
          href="/dashboard/housekeeping"
          className="flex items-center gap-4 p-6 rounded-xl bg-gradient-to-r from-blue-500/20 to-blue-600/10 border border-blue-500/20 hover:from-blue-500/30 hover:to-blue-600/20 transition"
        >
          <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center">
            <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
          </div>
          <div>
            <p className="font-semibold text-white">Housekeeping</p>
            <p className="text-sm text-slate-400">Cleaning schedule</p>
          </div>
        </Link>

        <Link
          href="/dashboard/settings"
          className="flex items-center gap-4 p-6 rounded-xl bg-gradient-to-r from-purple-500/20 to-purple-600/10 border border-purple-500/20 hover:from-purple-500/30 hover:to-purple-600/20 transition"
        >
          <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center">
            <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <div>
            <p className="font-semibold text-white">Settings</p>
            <p className="text-sm text-slate-400">Configure PMS</p>
          </div>
        </Link>
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
            <p className="text-sm text-slate-400">Guest Rooms</p>
            <span className="text-amber-400">🛏️</span>
          </div>
          <p className="text-3xl font-bold text-white">{stats.todayGuests}</p>
        </div>

        <div className="bg-slate-900 rounded-xl p-6 border border-slate-800">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-slate-400">RV Sites</p>
            <span className="text-blue-400">🚐</span>
          </div>
          <p className="text-3xl font-bold text-white">{stats.todayRV}</p>
        </div>
      </div>

      {/* Info Section */}
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
              Don't forget to checkout guests when they leave
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
