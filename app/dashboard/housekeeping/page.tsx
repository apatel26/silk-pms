'use client';

import { useState, useEffect } from 'react';
import dayjs from 'dayjs';

const GUEST_ROOMS = [101, 102, 103, 104, 105, 106, 107, 108, 109, 110, 111, 112, 201, 202, 203, 204, 205, 206, 207, 208, 209, 210, 211, 212];

interface HousekeepingTask {
  id: string;
  date: string;
  room_number: string;
  status: 'pending' | 'cleaned' | 'skip';
  notes: string | null;
  assigned_to: string | null;
  created_at: string;
}

export default function HousekeepingPage() {
  const [selectedDate, setSelectedDate] = useState(dayjs().format('YYYY-MM-DD'));
  const [tasks, setTasks] = useState<HousekeepingTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchTasks();
  }, [selectedDate]);

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/housekeeping?date=${selectedDate}`);
      if (res.ok) {
        const data = await res.json();
        setTasks(data);
      }
    } catch (error) {
      console.error('Error fetching tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTaskForRoom = (roomNum: number): HousekeepingTask | undefined => {
    return tasks.find(t => t.room_number === String(roomNum));
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'cleaned': return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'skip': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      default: return 'bg-slate-700 text-slate-400 border-slate-600';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'cleaned': return '✓';
      case 'skip': return '—';
      default: return '○';
    }
  };

  const updateTaskStatus = async (roomNum: number, status: 'pending' | 'cleaned' | 'skip') => {
    const existingTask = getTaskForRoom(roomNum);

    try {
      if (existingTask) {
        // Update existing task
        const res = await fetch('/api/housekeeping', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: existingTask.id, status }),
        });

        if (res.ok) {
          setTasks(tasks.map(t =>
            t.id === existingTask.id ? { ...t, status } : t
          ));
        }
      } else {
        // Create new task
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
    const nextStatus: 'pending' | 'cleaned' | 'skip' =
      currentStatus === 'pending' ? 'cleaned' :
      currentStatus === 'cleaned' ? 'skip' : 'pending';
    updateTaskStatus(roomNum, nextStatus);
  };

  const handlePrint = () => {
    window.print();
  };

  const stats = {
    total: GUEST_ROOMS.length,
    cleaned: tasks.filter(t => t.status === 'cleaned').length,
    pending: tasks.filter(t => t.status === 'pending').length,
    skipped: tasks.filter(t => t.status === 'skip').length,
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

          <div className="flex items-center gap-6 text-sm">
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
          </div>
        </div>
      </div>

      {/* Room Grid - Print-friendly */}
      <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-12 gap-2" id="printable-area">
        {GUEST_ROOMS.map((roomNum) => {
          const task = getTaskForRoom(roomNum);
          const status = task?.status || 'pending';

          return (
            <button
              key={roomNum}
              onClick={() => cycleStatus(roomNum)}
              className={`
                relative p-3 rounded-xl border-2 transition-all aspect-square flex flex-col items-center justify-center
                ${status === 'cleaned' ? 'bg-green-500/10 border-green-500/30 hover:bg-green-500/20' :
                  status === 'skip' ? 'bg-yellow-500/10 border-yellow-500/30 hover:bg-yellow-500/20' :
                  'bg-slate-800/50 border-slate-700 hover:bg-slate-800'}
              `}
            >
              <span className={`text-lg font-bold ${status === 'cleaned' ? 'text-green-400' : status === 'skip' ? 'text-yellow-400' : 'text-white'}`}>
                {roomNum}
              </span>
              <span className={`text-xl ${status === 'cleaned' ? 'text-green-400' : status === 'skip' ? 'text-yellow-400' : 'text-slate-500'}`}>
                {getStatusIcon(status)}
              </span>
              {roomNum >= 201 && (
                <span className="absolute top-1 left-1 w-2 h-2 rounded-full bg-blue-500" title="Floor 2"></span>
              )}
            </button>
          );
        })}
      </div>

      {/* Legend - Hidden when printing */}
      <div className="hidden print:block">
        <h2 className="text-xl font-bold mb-2">Housekeeping Report - {dayjs(selectedDate).format('MMMM D, YYYY')}</h2>
        <p>American Inn and RV Park</p>
      </div>

      <div className="bg-slate-900 rounded-xl p-6 border border-slate-800 print:hidden">
        <h3 className="text-lg font-semibold text-white mb-4">Legend & Instructions</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
          <div className="flex items-start gap-3">
            <span className="w-8 h-8 rounded-lg bg-green-500/20 border border-green-500/30 flex items-center justify-center text-green-400 font-bold">✓</span>
            <div>
              <p className="text-white font-medium">Cleaned</p>
              <p className="text-slate-400">Room has been cleaned and inspected</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <span className="w-8 h-8 rounded-lg bg-yellow-500/20 border border-yellow-500/30 flex items-center justify-center text-yellow-400 font-bold">—</span>
            <div>
              <p className="text-white font-medium">Skip</p>
              <p className="text-slate-400">Room skipped (occupied another day)</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <span className="w-8 h-8 rounded-lg bg-slate-700 border border-slate-600 flex items-center justify-center text-slate-400 font-bold">○</span>
            <div>
              <p className="text-white font-medium">Pending</p>
              <p className="text-slate-400">Room needs cleaning</p>
            </div>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-slate-700">
          <p className="text-sm text-slate-400">
            <strong className="text-white">Click</strong> a room to cycle through statuses: Pending → Cleaned → Skip → Pending
          </p>
          <p className="text-sm text-slate-400 mt-2">
            Use the <strong className="text-white">Print List</strong> button to print today's cleaning schedule
          </p>
        </div>
      </div>

      <style jsx global>{`
        @media print {
          body { background: white !important; }
          .print\\:hidden { display: none !important; }
          .print\\:block { display: block !important; }
          #printable-area { gap: 0.5rem; }
          #printable-area button {
            border: 1px solid #333 !important;
            background: white !important;
            color: black !important;
          }
          #printable-area button span { color: black !important; }
        }
      `}</style>
    </div>
  );
}
