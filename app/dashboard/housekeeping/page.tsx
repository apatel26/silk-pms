'use client';

import { useState, useEffect } from 'react';
import dayjs from 'dayjs';

const GUEST_ROOMS = [101, 102, 103, 104, 105, 106, 107, 108, 109, 110, 111, 112, 201, 202, 203, 204, 205, 206, 207, 208, 209, 210, 211, 212];

interface HousekeepingTask {
  id: string;
  date: string;
  room_number: string;
  status: 'pending' | 'cleaned' | 'skip' | 'out_of_order';
  notes: string | null;
  assigned_to: string | null;
  created_at: string;
}

interface Entry {
  id: string;
  room_number: string | null;
  check_out: string | null;
  status: string;
}

export default function HousekeepingPage() {
  const [selectedDate, setSelectedDate] = useState(dayjs().format('YYYY-MM-DD'));
  const [tasks, setTasks] = useState<HousekeepingTask[]>([]);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [tasksRes, entriesRes] = await Promise.all([
        fetch(`/api/housekeeping?date=${selectedDate}`),
        fetch(`/api/entries?date=${selectedDate}`)
      ]);

      if (tasksRes.ok) {
        const tasksData = await tasksRes.json();
        setTasks(Array.isArray(tasksData) ? tasksData : []);
      }

      if (entriesRes.ok) {
        const entriesData = await entriesRes.json();
        setEntries(Array.isArray(entriesData) ? entriesData : []);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedDate]);

  // Get rooms that need cleaning (active guests checking out today)
  const getRoomsNeedingCleaning = (): number[] => {
    const roomsCheckingOut = entries
      .filter(e => e.check_out === selectedDate && e.status === 'active' && e.room_number)
      .map(e => parseInt(e.room_number!));
    return Array.from(new Set(roomsCheckingOut));
  };

  const getTaskForRoom = (roomNum: number): HousekeepingTask | undefined => {
    return tasks.find(t => t.room_number === String(roomNum));
  };

  // Single click = cycle status
  const handleRoomClick = async (roomNum: number) => {
    const task = getTaskForRoom(roomNum);
    const currentStatus = task?.status || 'pending';
    const nextStatus: HousekeepingTask['status'] =
      currentStatus === 'pending' ? 'cleaned' :
      currentStatus === 'cleaned' ? 'skip' :
      currentStatus === 'skip' ? 'out_of_order' :
      'pending';

    try {
      let res;
      if (task) {
        res = await fetch('/api/housekeeping', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ id: task.id, status: nextStatus }),
        });
      } else {
        res = await fetch('/api/housekeeping', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            date: selectedDate,
            room_number: String(roomNum),
            status: nextStatus,
          }),
        });
      }

      if (res.ok) {
        fetchData();
      } else {
        const err = await res.text();
        alert('Error updating room ' + roomNum + ': ' + err);
      }
    } catch (error) {
      alert('Error: ' + String(error));
    }
  };

  // Generate tasks for rooms that need cleaning
  const handleGenerateFromEntries = async () => {
    const rooms = getRoomsNeedingCleaning();
    let created = 0;
    for (const roomNum of rooms) {
      const existingTask = getTaskForRoom(roomNum);
      if (!existingTask) {
        const res = await fetch('/api/housekeeping', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            date: selectedDate,
            room_number: String(roomNum),
            status: 'pending',
          }),
        });
        if (res.ok) created++;
      }
    }
    fetchData();
    alert('Auto: Created ' + created + ' tasks for rooms with checkouts today');
  };

  // Pending All
  const handlePendingAll = async () => {
    let created = 0;
    for (const roomNum of GUEST_ROOMS) {
      const existingTask = getTaskForRoom(roomNum);
      if (!existingTask) {
        const res = await fetch('/api/housekeeping', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            date: selectedDate,
            room_number: String(roomNum),
            status: 'pending',
          }),
        });
        if (res.ok) created++;
      }
    }
    fetchData();
    alert('Pending All: Created ' + created + ' pending tasks');
  };

  // Skip All
  const handleSkipAll = async () => {
    let created = 0;
    for (const roomNum of GUEST_ROOMS) {
      const existingTask = getTaskForRoom(roomNum);
      if (!existingTask) {
        const res = await fetch('/api/housekeeping', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            date: selectedDate,
            room_number: String(roomNum),
            status: 'skip',
          }),
        });
        if (res.ok) created++;
      }
    }
    fetchData();
    alert('Skip All: Created ' + created + ' skip tasks');
  };

  // Clean All
  const handleCleanAll = async () => {
    let created = 0;
    for (const roomNum of GUEST_ROOMS) {
      const existingTask = getTaskForRoom(roomNum);
      if (!existingTask) {
        const res = await fetch('/api/housekeeping', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            date: selectedDate,
            room_number: String(roomNum),
            status: 'cleaned',
          }),
        });
        if (res.ok) created++;
      }
    }
    fetchData();
    alert('Clean All: Created ' + created + ' cleaned tasks');
  };

  const handlePrint = () => {
    window.print();
  };

  const roomsNeedingCleaning = getRoomsNeedingCleaning();

  const stats = {
    cleaned: tasks.filter(t => t.status === 'cleaned').length,
    pending: tasks.filter(t => t.status === 'pending').length,
    skipped: tasks.filter(t => t.status === 'skip').length,
    outOfOrder: tasks.filter(t => t.status === 'out_of_order').length,
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'cleaned': return 'bg-green-500/20 border-green-500';
      case 'skip': return 'bg-yellow-500/20 border-yellow-500';
      case 'out_of_order': return 'bg-red-500/20 border-red-500';
      default: return 'bg-slate-700/50 border-slate-600';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'cleaned': return '✓';
      case 'skip': return '—';
      case 'out_of_order': return '✕';
      default: return '○';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Housekeeping</h1>
          <p className="text-slate-400">Click a room to cycle its status</p>
        </div>
        <button
          onClick={handlePrint}
          className="px-4 py-2 rounded-lg bg-blue-600/10 text-blue-400 border border-blue-600/20 hover:bg-blue-600/20 transition flex items-center gap-2"
        >
          Print
        </button>
      </div>

      {/* Date Selection */}
      <div className="bg-slate-900 rounded-xl p-6 border border-slate-800">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSelectedDate(dayjs(selectedDate).subtract(1, 'day').format('YYYY-MM-DD'))}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-white"
            >
              ←
            </button>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-4 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
            <button
              onClick={() => setSelectedDate(dayjs(selectedDate).add(1, 'day').format('YYYY-MM-DD'))}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-white"
            >
              →
            </button>
            <button
              onClick={() => setSelectedDate(dayjs().format('YYYY-MM-DD'))}
              className="px-3 py-2 rounded-lg bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 text-sm"
            >
              Today
            </button>
          </div>

          <div className="flex items-center gap-4 text-sm">
            <span className="text-green-400">✓ {stats.cleaned}</span>
            <span className="text-slate-400">○ {stats.pending}</span>
            <span className="text-yellow-400">— {stats.skipped}</span>
            <span className="text-red-400">✕ {stats.outOfOrder}</span>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex flex-wrap gap-2 pt-4 mt-4 border-t border-slate-700">
          <button
            onClick={handleGenerateFromEntries}
            className="px-3 py-1.5 rounded-lg bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 text-sm"
          >
            Auto ({roomsNeedingCleaning.length})
          </button>
          <button
            onClick={handlePendingAll}
            className="px-3 py-1.5 rounded-lg bg-slate-700 text-slate-300 hover:bg-slate-600 text-sm"
          >
            Pending All
          </button>
          <button
            onClick={handleCleanAll}
            className="px-3 py-1.5 rounded-lg bg-green-500/10 text-green-400 hover:bg-green-500/20 text-sm"
          >
            Clean All
          </button>
          <button
            onClick={handleSkipAll}
            className="px-3 py-1.5 rounded-lg bg-yellow-500/10 text-yellow-400 hover:bg-yellow-500/20 text-sm"
          >
            Skip All
          </button>
        </div>
      </div>

      {/* Room Grid */}
      <div className="bg-slate-900 rounded-xl p-6 border border-slate-800" id="printable-area">
        {loading ? (
          <div className="text-center text-slate-400 py-8">Loading...</div>
        ) : (
          <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-12 gap-2">
            {GUEST_ROOMS.map((roomNum) => {
              const task = getTaskForRoom(roomNum);
              const status = task?.status || 'pending';
              const needsCleaning = roomsNeedingCleaning.includes(roomNum);

              return (
                <button
                  key={roomNum}
                  onClick={() => handleRoomClick(roomNum)}
                  className={`
                    relative p-3 rounded-xl border-2 transition-all aspect-square flex flex-col items-center justify-center cursor-pointer
                    ${getStatusColor(status)}
                  `}
                >
                  <span className={`text-lg font-bold ${status === 'cleaned' ? 'text-green-400' : status === 'skip' ? 'text-yellow-400' : status === 'out_of_order' ? 'text-red-400' : 'text-white'}`}>
                    {roomNum}
                  </span>
                  <span className={`text-xl ${status === 'cleaned' ? 'text-green-400' : status === 'skip' ? 'text-yellow-400' : status === 'out_of_order' ? 'text-red-400' : 'text-slate-500'}`}>
                    {getStatusIcon(status)}
                  </span>
                  {roomNum >= 201 && (
                    <span className="absolute top-1 left-1 w-2 h-2 rounded-full bg-blue-500" />
                  )}
                  {needsCleaning && (
                    <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-amber-500" title="Guest checking out" />
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Print Header */}
      <div className="hidden print:block">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold">American Inn & RV Park</h1>
          <h2 className="text-xl">Housekeeping - {dayjs(selectedDate).format('MM/DD/YYYY')}</h2>
        </div>
      </div>

      {/* Legend */}
      <div className="bg-slate-900 rounded-xl p-6 border border-slate-800 print:hidden">
        <h3 className="text-sm font-semibold text-white mb-3">Click room to cycle: Pending → Cleaned → Skip → Out of Order → Pending</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded bg-green-500/20 border-2 border-green-500/50 flex items-center justify-center text-green-400 font-bold">✓</span>
            <span className="text-white">Cleaned</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded bg-yellow-500/20 border-2 border-yellow-500/50 flex items-center justify-center text-yellow-400 font-bold">—</span>
            <span className="text-white">Skipped</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded bg-red-500/20 border-2 border-red-500/50 flex items-center justify-center text-red-400 font-bold">✕</span>
            <span className="text-white">Out of Order</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded bg-slate-700/50 border-2 border-slate-600 flex items-center justify-center text-slate-400 font-bold">○</span>
            <span className="text-white">Pending</span>
          </div>
        </div>
        <p className="text-xs text-slate-500 mt-3">Amber dot = Guest checking out today (needs cleaning)</p>
      </div>

      <style jsx global>{`
        @media print {
          body { background: white !important; }
          .print\\:hidden { display: none !important; }
          .print\\:block { display: block !important; }
          #printable-area { border: none !important; background: white !important; padding: 0 !important; }
          #printable-area button { border: 1px solid #ccc !important; background: white !important; }
          #printable-area button span { color: black !important; }
        }
      `}</style>
    </div>
  );
}
