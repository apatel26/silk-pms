'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import dayjs from 'dayjs';
import { useTheme } from '@/lib/context/ThemeContext';
import { StatsCard } from '@/components/ui/StatsCard';
import {
  DndContext,
  DragEndEvent,
  useSensor,
  useSensors,
  PointerSensor,
  useDraggable,
} from '@dnd-kit/core';
import { useSortable } from '@dnd-kit/sortable';

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

function RoomCard({ roomNum, status, entry, onClick }: { roomNum: number; status: 'occupied' | 'available'; entry?: Entry; onClick?: () => void }) {
  const { isSilkUI } = useTheme();

  return (
    <div
      onClick={onClick}
      className={`
        relative p-3 rounded-xl border text-center transition-all duration-200 cursor-pointer
        hover:scale-105 tap-target
        ${isSilkUI ? 'glass-card' : 'legacy-card'}
        ${status === 'occupied'
          ? 'room-occupied'
          : 'room-available'}
      `}
    >
      <p className={`text-sm font-bold ${
        status === 'occupied' ? 'text-primary' : 'text-text-secondary'
      }`}>
        {roomNum}
      </p>
      {entry && (
        <p className="text-xs truncate mt-1" style={{ color: 'hsl(var(--text-primary))' }} title={entry.customer_name}>
          {entry.customer_name?.substring(0, 6) || 'Guest'}
        </p>
      )}
      {status === 'available' && (
        <p className="text-xs" style={{ color: 'hsl(var(--text-secondary))' }}>Vacant</p>
      )}
    </div>
  );
}

function SiteCard({ siteNum, status, entry, onClick }: { siteNum: number; status: 'occupied' | 'available'; entry?: Entry; onClick?: () => void }) {
  const { isSilkUI } = useTheme();

  return (
    <div
      onClick={onClick}
      className={`
        relative p-2 rounded-xl border text-center transition-all duration-200 cursor-pointer
        hover:scale-105 tap-target
        ${isSilkUI ? 'glass-card' : 'legacy-card'}
        ${status === 'occupied'
          ? 'rv-occupied'
          : 'rv-available'}
      `}
    >
      <p className={`text-xs font-bold ${
        status === 'occupied' ? 'text-secondary' : 'text-text-secondary'
      }`}>
        RV{siteNum}
      </p>
      {entry && (
        <p className="text-xs truncate mt-0.5" style={{ color: 'hsl(var(--text-primary))' }} title={entry.customer_name}>
          {entry.customer_name?.substring(0, 5) || 'Guest'}
        </p>
      )}
      {status === 'available' && (
        <p className="text-xs" style={{ color: 'hsl(var(--text-secondary))' }}>Open</p>
      )}
    </div>
  );
}

function DraggableEntry({ entry }: { entry: Entry }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: entry.id,
    data: entry,
  });

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
    opacity: isDragging ? 0.5 : 1,
  } : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`
        p-2 rounded-lg border cursor-grab active:cursor-grabbing
        ${entry.entry_type === 'guest'
          ? 'bg-primary/10 border-primary/30'
          : 'bg-secondary/10 border-secondary/30'}
      `}
    >
      <p className="text-xs font-medium truncate">{entry.customer_name || 'Guest'}</p>
      <p className="text-xs" style={{ color: 'hsl(var(--text-secondary))' }}>
        {entry.room_number || entry.site_number}
      </p>
    </div>
  );
}

export default function DashboardPage() {
  const { isSilkUI } = useTheme();
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

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const today = dayjs().format('YYYY-MM-DD');
      const month = dayjs().format('YYYY-MM');

      const [todayRes, monthRes] = await Promise.all([
        fetch(`/api/entries?date=${today}`),
        fetch(`/api/entries?month=${month}`),
      ]);

      const todayData = todayRes.ok ? await todayRes.json() : [];
      const monthData = monthRes.ok ? await monthRes.json() : [];

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

      setEntries(monthData || []);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getEntriesForDate = (date: dayjs.Dayjs) => {
    const dateStr = date.format('YYYY-MM-DD');
    return entries.filter((e: Entry) => {
      if (!e.check_in || !e.check_out) return false;
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
    const entry = dateEntries.find((e: Entry) => e.site_number === String(siteNum));
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

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;

    const entryId = active.id as string;
    const newRoomOrSite = over.id as string;

    // Find the entry and determine if it's moving to a new room/site
    const entry = entries.find(e => e.id === entryId);
    if (!entry) return;

    // Only allow dragging within the same entry type
    const isRoomChange = entry.entry_type === 'guest' && entry.room_number !== newRoomOrSite;
    const isSiteChange = entry.entry_type === 'rv' && entry.site_number !== newRoomOrSite;

    if (isRoomChange || isSiteChange) {
      // Update the entry via API
      try {
        const updateData = entry.entry_type === 'guest'
          ? { room_number: newRoomOrSite }
          : { site_number: newRoomOrSite };

        await fetch(`/api/entries/${entryId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updateData),
        });

        // Refresh data
        fetchDashboardData();
      } catch (error) {
        console.error('Error updating entry:', error);
      }
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex items-center gap-3" style={{ color: 'hsl(var(--text-secondary))' }}>
          <svg className="animate-spin h-6 w-6" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <span>Loading dashboard...</span>
        </div>
      </div>
    );
  }

  const daysInMonth = getDaysInMonth();
  const weekDays = getWeekDays();
  const firstDayOffset = daysInMonth[0].day();

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: 'hsl(var(--text-primary))' }}>Dashboard</h1>
            <p style={{ color: 'hsl(var(--text-secondary))' }}>{dayjs().format('dddd, MMMM D, YYYY')}</p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard/entries"
              className="px-4 py-2 rounded-lg font-semibold transition btn-primary"
            >
              + Add Entry
            </Link>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatsCard
            label="Today's Revenue"
            value={`$${stats.todayTotal.toFixed(2)}`}
            icon={<span className="text-xl">$</span>}
            variant="accent"
          />
          <StatsCard
            label="This Month"
            value={`$${stats.monthTotal.toFixed(2)}`}
            icon={<span className="text-xl">📅</span>}
            variant="default"
          />
          <StatsCard
            label={`Occupancy ${getOccupancyRate()}%`}
            value={`${stats.occupiedRooms + stats.occupiedSites}`}
            icon={<span className="text-xl">🏠</span>}
            variant="success"
          />
          <StatsCard
            label="Active Guests"
            value={`${stats.todayGuests + stats.todayRV}`}
            icon={<span className="text-xl">🚐</span>}
            variant="default"
          />
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { href: '/dashboard/entries', icon: '+', label: 'Add Entry', desc: 'New guest or RV', color: 'accent' },
            { href: '/dashboard/reports', icon: '📊', label: 'Reports', desc: 'Export Excel/PDF', color: 'success' },
            { href: '/dashboard/housekeeping', icon: '🧹', label: 'Housekeeping', desc: 'Cleaning schedule', color: 'secondary' },
            { href: '/dashboard/settings', icon: '⚙️', label: 'Settings', desc: 'Configure PMS', color: 'warning' },
          ].map((action) => (
            <Link
              key={action.href}
              href={action.href}
              className={`
                flex items-center gap-4 p-4 rounded-xl border transition
                ${isSilkUI ? 'glass-card hover:scale-[1.02]' : 'legacy-card hover:border-border-light'}
              `}
              style={{
                background: action.color === 'accent' ? 'hsl(var(--accent) / 0.1)' :
                           action.color === 'success' ? 'hsl(var(--success)) / 0.1' :
                           action.color === 'secondary' ? 'hsl(var(--accent-secondary)) / 0.1' :
                           'hsl(var(--warning)) / 0.1',
                borderColor: action.color === 'accent' ? 'hsl(var(--accent) / 0.3)' :
                            action.color === 'success' ? 'hsl(var(--success) / 0.3)' :
                            action.color === 'secondary' ? 'hsl(var(--accent-secondary) / 0.3)' :
                            'hsl(var(--warning) / 0.3)',
              }}
            >
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg">
                {action.icon}
              </div>
              <div>
                <p className="font-semibold" style={{ color: 'hsl(var(--text-primary))' }}>{action.label}</p>
                <p className="text-xs" style={{ color: 'hsl(var(--text-secondary))' }}>{action.desc}</p>
              </div>
            </Link>
          ))}
        </div>

        {/* Calendar View */}
        <div className={isSilkUI ? 'glass-card p-6' : 'legacy-card p-6'}>
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold" style={{ color: 'hsl(var(--text-primary))' }}>Booking Calendar</h3>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCalendarView('month')}
                className={`px-3 py-1 rounded text-sm font-medium transition ${
                  calendarView === 'month'
                    ? 'bg-primary/10 text-primary'
                    : 'bg-surface text-text-secondary hover:text-text-primary'
                }`}
              >
                Month
              </button>
              <button
                onClick={() => setCalendarView('week')}
                className={`px-3 py-1 rounded text-sm font-medium transition ${
                  calendarView === 'week'
                    ? 'bg-primary/10 text-primary'
                    : 'bg-surface text-text-secondary hover:text-text-primary'
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
              className="p-2 rounded-lg transition hover:bg-surface"
              style={{ color: 'hsl(var(--text-secondary))' }}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h4 className="font-semibold" style={{ color: 'hsl(var(--text-primary))' }}>
              {calendarView === 'month'
                ? selectedDate.format('MMMM YYYY')
                : `Week of ${selectedDate.startOf('week').format('MMM D')} - ${selectedDate.endOf('week').format('MMM D, YYYY')}`}
            </h4>
            <button
              onClick={() => calendarView === 'month' ? navigateMonth(1) : navigateWeek(1)}
              className="p-2 rounded-lg transition hover:bg-surface"
              style={{ color: 'hsl(var(--text-secondary))' }}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          {/* Today Button */}
          <button
            onClick={() => setSelectedDate(dayjs())}
            className="mb-4 px-3 py-1 rounded text-sm transition"
            style={{ background: 'hsl(var(--accent) / 0.1)', color: 'hsl(var(--accent))' }}
          >
            Today
          </button>

          {/* Room Availability Grid */}
          <div className="mb-6">
            <h5 className="text-sm font-medium mb-3" style={{ color: 'hsl(var(--text-secondary))' }}>
              Room Availability (as of {selectedDate.format('MMM D, YYYY')})
            </h5>
            <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-12 gap-2">
              {GUEST_ROOMS.map((roomNum) => {
                const status = getRoomStatus(roomNum);
                const entry = getEntriesForDate(selectedDate).find((e: Entry) => e.room_number === String(roomNum));
                return (
                  <RoomCard
                    key={`room-${roomNum}`}
                    roomNum={roomNum}
                    status={status}
                    entry={entry}
                    onClick={() => window.location.href = `/dashboard/entries?room=${roomNum}&date=${selectedDate.format('YYYY-MM-DD')}`}
                  />
                );
              })}
            </div>
          </div>

          {/* RV Site Availability Grid */}
          <div>
            <h5 className="text-sm font-medium mb-3" style={{ color: 'hsl(var(--text-secondary))' }}>RV Site Availability</h5>
            <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-10 lg:grid-cols-15 gap-2">
              {RV_SITES.map((siteNum) => {
                const status = getSiteStatus(siteNum);
                const entry = getEntriesForDate(selectedDate).find((e: Entry) => e.site_number === String(siteNum));
                return (
                  <SiteCard
                    key={`site-${siteNum}`}
                    siteNum={siteNum}
                    status={status}
                    entry={entry}
                    onClick={() => window.location.href = `/dashboard/entries?site=${siteNum}&date=${selectedDate.format('YYYY-MM-DD')}`}
                  />
                );
              })}
            </div>
          </div>

          {/* Legend */}
          <div className="flex items-center gap-4 mt-6 pt-4 border-t" style={{ borderColor: 'hsl(var(--border))' }}>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded" style={{ background: 'hsl(var(--room-occupied) / 0.2)', border: '1px solid hsl(var(--room-occupied) / 0.4)' }}></div>
              <span className="text-xs" style={{ color: 'hsl(var(--text-secondary))' }}>Occupied Room</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded" style={{ background: 'hsl(var(--rv-occupied) / 0.2)', border: '1px solid hsl(var(--rv-occupied) / 0.4)' }}></div>
              <span className="text-xs" style={{ color: 'hsl(var(--text-secondary))' }}>Occupied RV Site</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded" style={{ background: 'hsl(var(--surface))', border: '1px solid hsl(var(--border))' }}></div>
              <span className="text-xs" style={{ color: 'hsl(var(--text-secondary))' }}>Available</span>
            </div>
          </div>
        </div>

        {/* Info Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className={isSilkUI ? 'glass-card p-6' : 'legacy-card p-6'}>
            <h3 className="text-lg font-semibold mb-4" style={{ color: 'hsl(var(--text-primary))' }}>Quick Tips</h3>
            <ul className="space-y-3 text-sm" style={{ color: 'hsl(var(--text-secondary))' }}>
              <li className="flex items-start gap-2">
                <span style={{ color: 'hsl(var(--accent))' }}>•</span>
                Click on any room to add or edit an entry
              </li>
              <li className="flex items-start gap-2">
                <span style={{ color: 'hsl(var(--accent))' }}>•</span>
                Use the date picker to enter past entries
              </li>
              <li className="flex items-start gap-2">
                <span style={{ color: 'hsl(var(--accent))' }}>•</span>
                Export reports monthly for your records
              </li>
              <li className="flex items-start gap-2">
                <span style={{ color: 'hsl(var(--accent))' }}>•</span>
                Don&apos;t forget to checkout guests when they leave
              </li>
            </ul>
          </div>

          <div className={isSilkUI ? 'glass-card p-6' : 'legacy-card p-6'}>
            <h3 className="text-lg font-semibold mb-4" style={{ color: 'hsl(var(--text-primary))' }}>Silk PMS</h3>
            <p className="text-sm mb-4" style={{ color: 'hsl(var(--text-secondary))' }}>
              Your property management system for American Inn and RV Park.
            </p>
            <div className="flex items-center gap-2 text-sm" style={{ color: 'hsl(var(--text-secondary))' }}>
              <span>Powered by</span>
              <span className="font-medium" style={{ color: 'hsl(var(--accent))' }}>Silk PMS</span>
            </div>
          </div>
        </div>
      </div>
    </DndContext>
  );
}