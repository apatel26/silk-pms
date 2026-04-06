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

interface Entry {
  id: string;
  room_number: string | null;
  check_out: string | null;
  status: string;
}

interface TowelForm {
  [roomNum: number]: {
    B: string;
    H: string;
    F: string;
    BM: string;
  };
}

export default function HousekeepingPage() {
  const [selectedDate, setSelectedDate] = useState(dayjs().format('YYYY-MM-DD'));
  const [tasks, setTasks] = useState<HousekeepingTask[]>([]);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [towelForm, setTowelForm] = useState<TowelForm>({});
  const [showTowelForm, setShowTowelForm] = useState(false);

  // Initialize towel form for all rooms
  useEffect(() => {
    const initial: TowelForm = {};
    GUEST_ROOMS.forEach(r => {
      initial[r] = { B: '', H: '', F: '', BM: '' };
    });
    setTowelForm(initial);
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [tasksRes, entriesRes] = await Promise.all([
        fetch(`/api/housekeeping?date=${selectedDate}`),
        fetch(`/api/entries?date=${selectedDate}&housekeeping=true`)
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

  // Single click = cycle status (only cycles through valid DB statuses)
  // Valid statuses: pending, cleaned, skip (out_of_order not in DB yet)
  const handleRoomClick = async (roomNum: number) => {
    const task = getTaskForRoom(roomNum);
    const currentStatus = task?.status || 'pending';
    // Cycle: pending -> cleaned -> skip -> pending
    const nextStatus: HousekeepingTask['status'] =
      currentStatus === 'pending' ? 'cleaned' :
      currentStatus === 'cleaned' ? 'skip' :
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

  // Generate tasks for rooms that need cleaning (checkouts for selected date)
  const handleGenerateFromEntries = async () => {
    // Fetch fresh entries checking out today
    const res = await fetch(`/api/entries?checkout_date=${selectedDate}`);
    let checkoutEntries: Entry[] = [];
    if (res.ok) {
      checkoutEntries = await res.json();
    }
    const rooms = Array.from(new Set(checkoutEntries.map(e => parseInt(e.room_number!)))).filter(r => !isNaN(r));

    let count = 0;
    for (const roomNum of rooms) {
      const existingTask = getTaskForRoom(roomNum);
      if (existingTask) {
        // Update existing to pending
        await fetch('/api/housekeeping', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ id: existingTask.id, status: 'pending' }),
        });
        count++;
      } else {
        // Create new
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
        if (res.ok) count++;
      }
    }
    fetchData();
    alert('Auto: Updated ' + count + ' tasks for rooms with checkouts today');
  };

  // Pending All
  const handlePendingAll = async () => {
    let count = 0;
    for (const roomNum of GUEST_ROOMS) {
      const existingTask = getTaskForRoom(roomNum);
      if (existingTask) {
        await fetch('/api/housekeeping', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ id: existingTask.id, status: 'pending' }),
        });
        count++;
      } else {
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
        if (res.ok) count++;
      }
    }
    fetchData();
    alert('Pending All: Updated ' + count + ' rooms');
  };

  // Skip All
  const handleSkipAll = async () => {
    let count = 0;
    for (const roomNum of GUEST_ROOMS) {
      const existingTask = getTaskForRoom(roomNum);
      if (existingTask) {
        await fetch('/api/housekeeping', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ id: existingTask.id, status: 'skip' }),
        });
        count++;
      } else {
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
        if (res.ok) count++;
      }
    }
    fetchData();
    alert('Skip All: Updated ' + count + ' rooms');
  };

  // Clean All
  const handleCleanAll = async () => {
    let count = 0;
    for (const roomNum of GUEST_ROOMS) {
      const existingTask = getTaskForRoom(roomNum);
      if (existingTask) {
        await fetch('/api/housekeeping', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ id: existingTask.id, status: 'cleaned' }),
        });
        count++;
      } else {
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
        if (res.ok) count++;
      }
    }
    fetchData();
    alert('Clean All: Updated ' + count + ' rooms');
  };

  const handlePrint = () => {
    window.print();
  };

  const roomsNeedingCleaning = getRoomsNeedingCleaning();

  // Count stats based on ALL rooms, not just tasks
  // Default to "cleaned" unless there's an active guest or a specific task
  const getRoomStatus = (roomNum: number): 'occupied' | 'cleaned' | 'pending' | 'skip' => {
    const task = getTaskForRoom(roomNum);
    const hasActiveGuest = entries.some(
      e => e.room_number === String(roomNum) && e.status === 'active'
    );
    if (hasActiveGuest) return 'occupied';
    if (!task) return 'cleaned'; // Default to cleaned
    return task.status;
  };

  const stats = {
    occupied: entries.filter(e => e.status === 'active' && e.room_number).length,
    cleaned: GUEST_ROOMS.filter(r => getRoomStatus(r) === 'cleaned').length,
    pending: GUEST_ROOMS.filter(r => getRoomStatus(r) === 'pending').length,
    skipped: GUEST_ROOMS.filter(r => getRoomStatus(r) === 'skip').length,
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'occupied': return 'bg-blue-500/20 border-blue-500';
      case 'cleaned': return 'bg-green-500/20 border-green-500';
      case 'skip': return 'bg-yellow-500/20 border-yellow-500';
      default: return 'bg-slate-700/50 border-slate-600';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'occupied': return '●';
      case 'cleaned': return '✓';
      case 'skip': return '—';
      default: return '○';
    }
  };

  const updateTowelForm = (roomNum: number, field: 'B' | 'H' | 'F' | 'BM', value: string) => {
    setTowelForm(prev => ({
      ...prev,
      [roomNum]: {
        ...prev[roomNum],
        [field]: value,
      },
    }));
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Housekeeping</h1>
          <p className="text-slate-400">Click a room to cycle its status</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowTowelForm(!showTowelForm)}
            className={`px-4 py-2 rounded-lg border transition flex items-center gap-2 ${
              showTowelForm
                ? 'bg-blue-600/10 text-blue-400 border-blue-600/20'
                : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
            }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            Towel Form
          </button>
          <button
            onClick={handlePrint}
            className="px-4 py-2 rounded-lg bg-blue-600/10 text-blue-400 border border-blue-600/20 hover:bg-blue-600/20 transition flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            Print
          </button>
        </div>
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
            <span className="text-blue-400">● {stats.occupied}</span>
            <span className="text-green-400">✓ {stats.cleaned}</span>
            <span className="text-slate-400">○ {stats.pending}</span>
            <span className="text-yellow-400">— {stats.skipped}</span>
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
              const status = getRoomStatus(roomNum);
              const isOccupied = status === 'occupied';

              return (
                <button
                  key={roomNum}
                  onClick={() => !isOccupied && handleRoomClick(roomNum)}
                  disabled={isOccupied}
                  className={`
                    relative p-3 rounded-xl border-2 transition-all aspect-square flex flex-col items-center justify-center
                    ${isOccupied ? 'cursor-not-allowed opacity-75' : 'cursor-pointer'}
                    ${getStatusColor(status)}
                  `}
                >
                  <span className={`text-lg font-bold ${status === 'occupied' ? 'text-blue-400' : status === 'cleaned' ? 'text-green-400' : status === 'skip' ? 'text-yellow-400' : 'text-white'}`}>
                    {roomNum}
                  </span>
                  <span className={`text-xl ${status === 'occupied' ? 'text-blue-400' : status === 'cleaned' ? 'text-green-400' : status === 'skip' ? 'text-yellow-400' : 'text-slate-500'}`}>
                    {getStatusIcon(status)}
                  </span>
                  {roomNum >= 201 && (
                    <span className="absolute top-1 left-1 w-2 h-2 rounded-full bg-blue-500" />
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Towel Form Section */}
      {showTowelForm && (
        <div className="bg-slate-900 rounded-xl p-6 border border-slate-800 print:hidden">
          <h3 className="text-lg font-semibold text-white mb-4">Towel Inventory - Fill in quantities used</h3>
          <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-12 gap-2">
            {GUEST_ROOMS.map((roomNum) => (
              <div key={roomNum} className="text-center">
                <div className="text-white font-bold text-sm mb-1">{roomNum}</div>
                <div className="space-y-1">
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-slate-400 w-5">B</span>
                    <input
                      type="text"
                      value={towelForm[roomNum]?.B || ''}
                      onChange={(e) => updateTowelForm(roomNum, 'B', e.target.value)}
                      className="w-8 h-6 text-center text-sm bg-slate-800 border border-slate-600 text-white rounded"
                    />
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-slate-400 w-5">H</span>
                    <input
                      type="text"
                      value={towelForm[roomNum]?.H || ''}
                      onChange={(e) => updateTowelForm(roomNum, 'H', e.target.value)}
                      className="w-8 h-6 text-center text-sm bg-slate-800 border border-slate-600 text-white rounded"
                    />
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-slate-400 w-5">F</span>
                    <input
                      type="text"
                      value={towelForm[roomNum]?.F || ''}
                      onChange={(e) => updateTowelForm(roomNum, 'F', e.target.value)}
                      className="w-8 h-6 text-center text-sm bg-slate-800 border border-slate-600 text-white rounded"
                    />
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-slate-400 w-5">BM</span>
                    <input
                      type="text"
                      value={towelForm[roomNum]?.BM || ''}
                      onChange={(e) => updateTowelForm(roomNum, 'BM', e.target.value)}
                      className="w-8 h-6 text-center text-sm bg-slate-800 border border-slate-600 text-white rounded"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 text-xs text-slate-400">
            <p>B = Bath Towel | H = Hand Towel | F = Face Towel | BM = Bath Mat</p>
          </div>
        </div>
      )}

      {/* Print Header - Only shows when printing */}
      <div className="hidden print:block">
        <div className="text-center mb-2">
          <h1 className="text-lg font-bold">American Inn & RV Park - Housekeeping</h1>
          <h2 className="text-sm">{dayjs(selectedDate).format('MM/DD/YYYY')}</h2>
        </div>

        {/* Room Status + Towel Table */}
        <table className="w-full border-collapse border border-black text-xs">
          <thead>
            <tr className="bg-slate-200">
              <th className="border border-black p-1 text-center">Rm</th>
              <th className="border border-black p-1 text-center">Status</th>
              <th className="border border-black p-1 text-center">B</th>
              <th className="border border-black p-1 text-center">H</th>
              <th className="border border-black p-1 text-center">F</th>
              <th className="border border-black p-1 text-center">BM</th>
              <th className="border border-black p-1 text-center">Rm</th>
              <th className="border border-black p-1 text-center">Status</th>
              <th className="border border-black p-1 text-center">B</th>
              <th className="border border-black p-1 text-center">H</th>
              <th className="border border-black p-1 text-center">F</th>
              <th className="border border-black p-1 text-center">BM</th>
            </tr>
          </thead>
          <tbody>
            {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((i) => {
              const room1 = GUEST_ROOMS[i];
              const room2 = GUEST_ROOMS[i + 12];
              const status1 = getRoomStatus(room1);
              const status2 = room2 ? getRoomStatus(room2) : null;
              const isLastOfFloor = i === 11;
              return (
                <>
                  <tr key={i} className="border-b border-black">
                    <td className="border border-black p-1 text-center font-bold">{room1}</td>
                    <td className="border border-black p-1 text-center">{status1 === 'occupied' ? 'D' : status1.charAt(0).toUpperCase()}</td>
                    <td className="border border-black p-1 text-center w-6"></td>
                    <td className="border border-black p-1 text-center w-6"></td>
                    <td className="border border-black p-1 text-center w-6"></td>
                    <td className="border border-black p-1 text-center w-6"></td>
                    {room2 ? (
                      <>
                        <td className="border border-black p-1 text-center font-bold">{room2}</td>
                        <td className="border border-black p-1 text-center">{status2 === 'occupied' ? 'D' : status2!.charAt(0).toUpperCase()}</td>
                        <td className="border border-black p-1 text-center w-6"></td>
                        <td className="border border-black p-1 text-center w-6"></td>
                        <td className="border border-black p-1 text-center w-6"></td>
                        <td className="border border-black p-1 text-center w-6"></td>
                      </>
                    ) : (
                      <>
                        <td className="border border-black p-1"></td>
                        <td className="border border-black p-1"></td>
                        <td className="border border-black p-1"></td>
                        <td className="border border-black p-1"></td>
                        <td className="border border-black p-1"></td>
                        <td className="border border-black p-1"></td>
                      </>
                    )}
                  </tr>
                  {isLastOfFloor && (
                    <tr key={'spacer-' + i} className="border-b border-black">
                      <td colSpan={6} className="border border-black p-1 bg-slate-100">2nd Floor</td>
                      <td colSpan={6} className="border border-black p-1 bg-slate-100"></td>
                    </tr>
                  )}
                </>
              );
            })}
          </tbody>
        </table>
        <p className="text-xs mt-1">B=Bath Towel H=Hand Towel F=Face Towel BM=Bath Mat | Status: C=Cleaned P=Pending S=Skip D=Dirty</p>
      </div>

      {/* Legend */}
      <div className="bg-slate-900 rounded-xl p-6 border border-slate-800 print:hidden">
        <h3 className="text-sm font-semibold text-white mb-3">Click room to cycle: Pending → Cleaned → Skip → Pending (Occupied rooms can't be changed)</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded bg-blue-500/20 border-2 border-blue-500/50 flex items-center justify-center text-blue-400 font-bold">●</span>
            <span className="text-white">Occupied</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded bg-green-500/20 border-2 border-green-500/50 flex items-center justify-center text-green-400 font-bold">✓</span>
            <span className="text-white">Cleaned</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded bg-yellow-500/20 border-2 border-yellow-500/50 flex items-center justify-center text-yellow-400 font-bold">—</span>
            <span className="text-white">Skipped</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded bg-slate-700/50 border-2 border-slate-600 flex items-center justify-center text-slate-400 font-bold">○</span>
            <span className="text-white">Pending</span>
          </div>
        </div>
      </div>

      <style jsx global>{`
        @media print {
          body { background: white !important; }
          .print\\:hidden { display: none !important; }
          .print\\:block { display: block !important; }
          #printable-area { border: none !important; background: white !important; padding: 0 !important; }
          #printable-area button { display: none; }
          * { color: black !important; }
          .border-black { border-color: black !important; }
          .bg-slate-200 { background-color: #e5e5e5 !important; }
        }
      `}</style>
    </div>
  );
}
