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
  const [selectedRooms, setSelectedRooms] = useState<number[]>([]);
  const [bulkAction, setBulkAction] = useState<string>('');

  useEffect(() => {
    fetchData();
  }, [selectedDate]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch tasks for selected date
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
      setTasks([]);
      setEntries([]);
    } finally {
      setLoading(false);
    }
  };

  // Auto-calculate rooms that need cleaning based on entries
  const getRoomsNeedingCleaning = (): number[] => {
    // Rooms with active entries checking out today need cleaning
    const roomsCheckingOut = entries
      .filter(e => e.check_out === selectedDate && e.status === 'active' && e.room_number)
      .map(e => parseInt(e.room_number!));

    // Rooms with entries that are active (still occupied but need service)
    const activeRooms = entries
      .filter(e => e.room_number && e.status === 'active')
      .map(e => parseInt(e.room_number!));

    return Array.from(new Set([...roomsCheckingOut, ...activeRooms]));
  };

  const getTaskForRoom = (roomNum: number): HousekeepingTask | undefined => {
    return tasks.find(t => t.room_number === String(roomNum));
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'cleaned': return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'skip': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'out_of_order': return 'bg-red-500/20 text-red-400 border-red-500/30';
      default: return 'bg-slate-700 text-slate-400 border-slate-600';
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

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'cleaned': return 'Cleaned';
      case 'skip': return 'Skipped';
      case 'out_of_order': return 'Out of Order';
      default: return 'Pending';
    }
  };

  const updateTaskStatus = async (roomNum: number, status: HousekeepingTask['status']) => {
    const existingTask = getTaskForRoom(roomNum);

    try {
      if (existingTask) {
        const res = await fetch('/api/housekeeping', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: existingTask.id, status }),
        });

        if (res.ok) {
          const updated = await res.json();
          setTasks(tasks.map(t => t.id === existingTask.id ? updated : t));
        }
      } else {
        const res = await fetch('/api/housekeeping', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            date: selectedDate,
            room_number: String(roomNum),
            status,
          }),
        });

        if (res.ok) {
          const newTask = await res.json();
          setTasks([...tasks, newTask]);
        }
      }
    } catch (error) {
      console.error('Error updating task:', error);
    }
  };

  const cycleStatus = (roomNum: number) => {
    const task = getTaskForRoom(roomNum);
    const currentStatus = task?.status || 'pending';
    const nextStatus: HousekeepingTask['status'] =
      currentStatus === 'pending' ? 'cleaned' :
      currentStatus === 'cleaned' ? 'skip' :
      currentStatus === 'skip' ? 'out_of_order' :
      currentStatus === 'out_of_order' ? 'pending' : 'pending';
    updateTaskStatus(roomNum, nextStatus);
  };

  const toggleRoomSelection = (roomNum: number) => {
    setSelectedRooms(prev =>
      prev.includes(roomNum)
        ? prev.filter(r => r !== roomNum)
        : [...prev, roomNum]
    );
  };

  const handleBulkAction = () => {
    if (!bulkAction || selectedRooms.length === 0) return;

    selectedRooms.forEach(roomNum => {
      updateTaskStatus(roomNum, bulkAction as HousekeepingTask['status']);
    });

    setSelectedRooms([]);
    setBulkAction('');
  };

  const handleGenerateFromEntries = async () => {
    const roomsNeedingCleaning = getRoomsNeedingCleaning();

    for (const roomNum of roomsNeedingCleaning) {
      const existingTask = getTaskForRoom(roomNum);
      if (!existingTask) {
        await updateTaskStatus(roomNum, 'pending');
      }
    }
  };

  const handleSkipAll = async () => {
    for (const roomNum of GUEST_ROOMS) {
      const existingTask = getTaskForRoom(roomNum);
      if (!existingTask) {
        await updateTaskStatus(roomNum, 'skip');
      }
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const roomsNeedingCleaning = getRoomsNeedingCleaning();

  const stats = {
    total: GUEST_ROOMS.length,
    cleaned: tasks.filter(t => t.status === 'cleaned').length,
    pending: tasks.filter(t => t.status === 'pending').length,
    skipped: tasks.filter(t => t.status === 'skip').length,
    outOfOrder: tasks.filter(t => t.status === 'out_of_order').length,
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Housekeeping</h1>
          <p className="text-slate-400">Manage room cleaning status</p>
        </div>
        <button
          onClick={handlePrint}
          className="px-4 py-2 rounded-lg bg-blue-600/10 text-blue-400 border border-blue-600/20 hover:bg-blue-600/20 transition flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
          </svg>
          Print List
        </button>
      </div>

      {/* Date Selection & Stats */}
      <div className="bg-slate-900 rounded-xl p-6 border border-slate-800">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-4">
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
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-green-500"></span>
              <span className="text-slate-300">Cleaned: {stats.cleaned}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-slate-500"></span>
              <span className="text-slate-300">Pending: {stats.pending}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-yellow-500"></span>
              <span className="text-slate-300">Skip: {stats.skipped}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-red-500"></span>
              <span className="text-slate-300">OOO: {stats.outOfOrder}</span>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex flex-wrap gap-2 pt-4 border-t border-slate-700">
          <button
            onClick={handleGenerateFromEntries}
            className="px-3 py-1.5 rounded-lg bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 text-sm"
          >
            Generate from Checkouts ({roomsNeedingCleaning.length})
          </button>
          <button
            onClick={handleSkipAll}
            className="px-3 py-1.5 rounded-lg bg-slate-700 text-slate-300 hover:bg-slate-600 text-sm"
          >
            Skip All
          </button>
          <button
            onClick={() => {
              GUEST_ROOMS.forEach(roomNum => updateTaskStatus(roomNum, 'cleaned'));
            }}
            className="px-3 py-1.5 rounded-lg bg-green-500/10 text-green-400 hover:bg-green-500/20 text-sm"
          >
            Clean All
          </button>
        </div>
      </div>

      {/* Bulk Edit */}
      {selectedRooms.length > 0 && (
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 flex items-center justify-between">
          <span className="text-amber-400">{selectedRooms.length} room(s) selected</span>
          <div className="flex items-center gap-2">
            <select
              value={bulkAction}
              onChange={(e) => setBulkAction(e.target.value)}
              className="px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-white text-sm"
            >
              <option value="">Select action...</option>
              <option value="cleaned">Mark Cleaned</option>
              <option value="skip">Mark Skip</option>
              <option value="out_of_order">Mark Out of Order</option>
              <option value="pending">Mark Pending</option>
            </select>
            <button
              onClick={handleBulkAction}
              disabled={!bulkAction}
              className="px-4 py-1.5 rounded-lg bg-amber-500 text-slate-900 font-medium hover:bg-amber-400 disabled:opacity-50 text-sm"
            >
              Apply
            </button>
            <button
              onClick={() => setSelectedRooms([])}
              className="px-4 py-1.5 rounded-lg bg-slate-700 text-slate-300 hover:bg-slate-600 text-sm"
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {/* Room Grid - Print-friendly */}
      <div className="bg-slate-900 rounded-xl p-6 border border-slate-800" id="printable-area">
        <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-12 gap-2">
          {GUEST_ROOMS.map((roomNum) => {
            const task = getTaskForRoom(roomNum);
            const status = task?.status || 'pending';
            const needsCleaning = roomsNeedingCleaning.includes(roomNum);
            const isSelected = selectedRooms.includes(roomNum);

            return (
              <button
                key={roomNum}
                onClick={() => needsCleaning ? toggleRoomSelection(roomNum) : cycleStatus(roomNum)}
                onDoubleClick={() => cycleStatus(roomNum)}
                className={`
                  relative p-3 rounded-xl border-2 transition-all aspect-square flex flex-col items-center justify-center cursor-pointer
                  ${isSelected ? 'ring-2 ring-amber-500 ring-offset-2 ring-offset-slate-900' : ''}
                  ${status === 'cleaned' ? 'bg-green-500/10 border-green-500/30 hover:bg-green-500/20' :
                    status === 'skip' ? 'bg-yellow-500/10 border-yellow-500/30 hover:bg-yellow-500/20' :
                    status === 'out_of_order' ? 'bg-red-500/10 border-red-500/30 hover:bg-red-500/20' :
                    'bg-slate-800/50 border-slate-700 hover:bg-slate-800'}
                `}
              >
                <span className={`text-lg font-bold ${status === 'cleaned' ? 'text-green-400' : status === 'skip' ? 'text-yellow-400' : status === 'out_of_order' ? 'text-red-400' : 'text-white'}`}>
                  {roomNum}
                </span>
                <span className={`text-xl ${status === 'cleaned' ? 'text-green-400' : status === 'skip' ? 'text-yellow-400' : status === 'out_of_order' ? 'text-red-400' : 'text-slate-500'}`}>
                  {getStatusIcon(status)}
                </span>
                {roomNum >= 201 && (
                  <span className="absolute top-1 left-1 w-2 h-2 rounded-full bg-blue-500" title="Floor 2"></span>
                )}
                {needsCleaning && status === 'pending' && (
                  <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-amber-500 animate-pulse" title="Needs cleaning"></span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Print Header - Only shows when printing */}
      <div className="hidden print:block pt-8">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold">American Inn & RV Park</h1>
          <h2 className="text-xl">Housekeeping Report</h2>
          <p className="text-gray-600">{dayjs(selectedDate).format('dddd, MMMM D, YYYY')}</p>
        </div>
        <div className="grid grid-cols-4 gap-4 text-sm mb-6">
          <div className="text-center p-4 bg-green-100 rounded">
            <p className="text-2xl font-bold text-green-600">{stats.cleaned}</p>
            <p>Cleaned</p>
          </div>
          <div className="text-center p-4 bg-yellow-100 rounded">
            <p className="text-2xl font-bold text-yellow-600">{stats.skipped}</p>
            <p>Skipped</p>
          </div>
          <div className="text-center p-4 bg-red-100 rounded">
            <p className="text-2xl font-bold text-red-600">{stats.outOfOrder}</p>
            <p>Out of Order</p>
          </div>
          <div className="text-center p-4 bg-gray-100 rounded">
            <p className="text-2xl font-bold text-gray-600">{stats.pending}</p>
            <p>Pending</p>
          </div>
        </div>
      </div>

      {/* Legend & Instructions */}
      <div className="bg-slate-900 rounded-xl p-6 border border-slate-800 print:hidden">
        <h3 className="text-lg font-semibold text-white mb-4">Legend</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
          <div className="flex items-center gap-3">
            <span className="w-8 h-8 rounded-lg bg-green-500/20 border border-green-500/30 flex items-center justify-center text-green-400 font-bold">✓</span>
            <div>
              <p className="text-white font-medium">Cleaned</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="w-8 h-8 rounded-lg bg-yellow-500/20 border border-yellow-500/30 flex items-center justify-center text-yellow-400 font-bold">—</span>
            <div>
              <p className="text-white font-medium">Skipped</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="w-8 h-8 rounded-lg bg-red-500/20 border border-red-500/30 flex items-center justify-center text-red-400 font-bold">✕</span>
            <div>
              <p className="text-white font-medium">Out of Order</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="w-8 h-8 rounded-lg bg-slate-700 border border-slate-600 flex items-center justify-center text-slate-400 font-bold">○</span>
            <div>
              <p className="text-white font-medium">Pending</p>
            </div>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-slate-700 space-y-2 text-sm text-slate-400">
          <p><strong className="text-white">Single click</strong> on highlighted room: Select for bulk action</p>
          <p><strong className="text-white">Double click</strong> any room: Cycle status</p>
          <p><strong className="text-white">Generate from Checkouts</strong>: Auto-populate rooms from entry check-outs</p>
          <p><strong className="text-white">Amber dot</strong>: Room needs cleaning based on today&apos;s checkouts</p>
        </div>
      </div>

      <style jsx global>{`
        @media print {
          body { background: white !important; }
          .print\\:hidden { display: none !important; }
          .print\\:block { display: block !important; }
          #printable-area { border: none !important; background: white !important; padding: 0 !important; }
          #printable-area button {
            border: 1px solid #ccc !important;
            background: white !important;
          }
          #printable-area button span { color: black !important; }
        }
      `}</style>
    </div>
  );
}
