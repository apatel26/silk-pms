'use client';

import { useEffect, useState } from 'react';
import dayjs from 'dayjs';

// Room numbers from your Excel
const GUEST_ROOMS = [101, 102, 103, 104, 105, 106, 107, 108, 109, 110, 111, 112, 201, 202, 203, 204, 205, 206, 207, 208, 209, 210, 211, 212];
const RV_SITES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15];

interface Entry {
  id: string;
  date: string;
  room_number: number;
  entry_type: 'guest' | 'rv';
  name: string;
  check_in: string;
  check_out: string;
  rate: number;
  tax_c: number;
  tax_s: number;
  total: number;
  cash: number | null;
  cc: number | null;
  note: string | null;
}

export default function DashboardPage() {
  const [selectedDate, setSelectedDate] = useState(dayjs().format('YYYY-MM-DD'));
  const [selectedMonth, setSelectedMonth] = useState(dayjs().format('YYYY-MM'));
  const [view, setView] = useState<'daily' | 'monthly'>('daily');
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEntryModal, setShowEntryModal] = useState(false);
  const [editingEntry, setEditingEntry] = useState<Entry | null>(null);
  const [entryForm, setEntryForm] = useState({
    room_number: 101,
    name: '',
    check_in: '',
    check_out: '',
    rate: 0,
    cash: null as number | null,
    cc: null as number | null,
    note: '',
    entry_type: 'guest' as 'guest' | 'rv',
  });

  useEffect(() => {
    fetchEntries();
  }, [selectedDate, selectedMonth]);

  const fetchEntries = async () => {
    try {
      const month = view === 'daily' ? selectedDate.substring(0, 7) : selectedMonth;
      const res = await fetch(`/api/entries?month=${month}`);
      const data = await res.json();
      setEntries(data);
    } catch (error) {
      console.error('Error fetching entries:', error);
    } finally {
      setLoading(false);
    }
  };

  const getEntryForRoom = (roomNum: number, type: 'guest' | 'rv' = 'guest') => {
    const dateStr = view === 'daily' ? selectedDate : selectedMonth + '-01';
    return entries.find(
      (e) => e.room_number === roomNum && e.date === dateStr && e.entry_type === type
    );
  };

  const handleSaveEntry = async () => {
    try {
      const rate = entryForm.rate;
      const tax_c = rate * 0.07;
      const tax_s = rate * 0.06;
      const total = rate + tax_c + tax_s;

      const payload = {
        date: view === 'daily' ? selectedDate : selectedMonth + '-01',
        room_number: entryForm.room_number,
        entry_type: entryForm.entry_type,
        name: entryForm.name || null,
        check_in: entryForm.check_in || null,
        check_out: entryForm.check_out || null,
        rate: rate,
        tax_c: tax_c,
        tax_s: tax_s,
        total: total,
        cash: entryForm.cash,
        cc: entryForm.cc,
        note: entryForm.note || null,
      };

      if (editingEntry) {
        await fetch(`/api/entries?id=${editingEntry.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } else {
        await fetch('/api/entries', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }

      setShowEntryModal(false);
      setEditingEntry(null);
      resetForm();
      fetchEntries();
    } catch (error) {
      console.error('Error saving entry:', error);
    }
  };

  const handleEditEntry = (entry: Entry) => {
    setEditingEntry(entry);
    setEntryForm({
      room_number: entry.room_number,
      name: entry.name || '',
      check_in: entry.check_in || '',
      check_out: entry.check_out || '',
      rate: entry.rate,
      cash: entry.cash,
      cc: entry.cc,
      note: entry.note || '',
      entry_type: entry.entry_type,
    });
    setShowEntryModal(true);
  };

  const handleDeleteEntry = async (id: string) => {
    if (!confirm('Delete this entry?')) return;
    try {
      await fetch(`/api/entries?id=${id}`, { method: 'DELETE' });
      fetchEntries();
    } catch (error) {
      console.error('Error deleting entry:', error);
    }
  };

  const resetForm = () => {
    setEntryForm({
      room_number: 101,
      name: '',
      check_in: '',
      check_out: '',
      rate: 0,
      cash: null,
      cc: null,
      note: '',
      entry_type: 'guest',
    });
  };

  // Calculate daily/RV summary
  const getSummary = () => {
    const dateStr = view === 'daily' ? selectedDate : selectedMonth + '-01';
    const dayEntries = entries.filter((e) => e.date === dateStr);
    const guestEntries = dayEntries.filter((e) => e.entry_type === 'guest');
    const rvEntries = dayEntries.filter((e) => e.entry_type === 'rv');

    const sum = (field: keyof Entry) => dayEntries.reduce((s, e) => s + (Number(e[field]) || 0), 0);

    return {
      numGuestRooms: guestEntries.filter((e) => e.rate > 0).length,
      numRVSites: rvEntries.filter((e) => e.rate > 0).length,
      totalRate: sum('rate'),
      totalTaxC: sum('tax_c'),
      totalTaxS: sum('tax_s'),
      total: sum('total'),
      totalCash: sum('cash'),
      totalCC: sum('cc'),
    };
  };

  const summary = getSummary();

  if (loading) {
    return <div className="text-center py-12 text-slate-500">Loading...</div>;
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Monthly Sheet</h2>
          <p className="text-slate-500">
            {view === 'daily'
              ? dayjs(selectedDate).format('dddd, MMMM D, YYYY')
              : dayjs(selectedMonth + '-01').format('MMMM YYYY')}
          </p>
        </div>
        <div className="flex items-center gap-4">
          {/* View Toggle */}
          <div className="flex bg-slate-100 rounded-lg p-1">
            <button
              onClick={() => setView('daily')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition ${
                view === 'daily' ? 'bg-white shadow text-blue-600' : 'text-slate-600'
              }`}
            >
              Daily View
            </button>
            <button
              onClick={() => setView('monthly')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition ${
                view === 'monthly' ? 'bg-white shadow text-blue-600' : 'text-slate-600'
              }`}
            >
              Monthly
            </button>
          </div>

          {/* Date/Month Picker */}
          {view === 'daily' ? (
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-4 py-2 border border-slate-300 rounded-lg"
            />
          ) : (
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="px-4 py-2 border border-slate-300 rounded-lg"
            />
          )}
        </div>
      </div>

      {/* Summary Bar */}
      <div className="bg-slate-800 text-white rounded-xl p-4 mb-6">
        <div className="grid grid-cols-10 gap-4 text-sm">
          <div className="text-center">
            <div className="text-2xl font-bold">{summary.numGuestRooms}</div>
            <div className="text-slate-400 text-xs"># Rms</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold">{summary.totalRate.toFixed(2)}</div>
            <div className="text-slate-400 text-xs">Rate</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold">{summary.totalTaxC.toFixed(2)}</div>
            <div className="text-slate-400 text-xs">Tx-C 7%</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold">{summary.totalTaxS.toFixed(2)}</div>
            <div className="text-slate-400 text-xs">Tx-S 6%</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-400">{summary.total.toFixed(2)}</div>
            <div className="text-slate-400 text-xs">Total</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-400">{summary.totalCash.toFixed(2)}</div>
            <div className="text-slate-400 text-xs">Cash</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-400">{summary.totalCC.toFixed(2)}</div>
            <div className="text-slate-400 text-xs">CC</div>
          </div>
        </div>
      </div>

      {/* Guest Rooms Section */}
      <div className="bg-white rounded-xl shadow-sm mb-6">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <h3 className="font-semibold text-slate-800">Guest Rooms</h3>
          <button
            onClick={() => {
              resetForm();
              setEditingEntry(null);
              setEntryForm({ ...entryForm, entry_type: 'guest' });
              setShowEntryModal(true);
            }}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700"
          >
            + Add Guest
          </button>
        </div>

        {/* Header Row */}
        <div className="grid grid-cols-10 gap-2 px-6 py-3 bg-slate-50 text-xs font-semibold text-slate-600">
          <div>Room#</div>
          <div className="col-span-2">Name</div>
          <div>In</div>
          <div>Out</div>
          <div>Rate</div>
          <div>Tx-C7%</div>
          <div>Tx-S6%</div>
          <div>Total</div>
          <div>Cash / CC</div>
        </div>

        {/* Room Rows */}
        {GUEST_ROOMS.map((roomNum) => {
          const entry = getEntryForRoom(roomNum, 'guest');
          return (
            <div
              key={roomNum}
              className="grid grid-cols-10 gap-2 px-6 py-3 border-t border-slate-100 hover:bg-slate-50 cursor-pointer"
              onClick={() => entry && handleEditEntry(entry)}
            >
              <div className="font-medium text-slate-800">{roomNum}</div>
              <div className="col-span-2 text-slate-600 truncate">{entry?.name || ''}</div>
              <div className="text-slate-500 text-sm">
                {entry?.check_in ? dayjs(entry.check_in).format('M/D') : ''}
              </div>
              <div className="text-slate-500 text-sm">
                {entry?.check_out ? dayjs(entry.check_out).format('M/D') : ''}
              </div>
              <div className="text-slate-700">{entry?.rate?.toFixed(2) || '0.00'}</div>
              <div className="text-slate-500">{entry?.tax_c?.toFixed(2) || '0.00'}</div>
              <div className="text-slate-500">{entry?.tax_s?.toFixed(2) || '0.00'}</div>
              <div className="text-slate-800 font-medium">
                {entry?.total?.toFixed(2) || '0.00'}
              </div>
              <div className="text-sm">
                {entry && (entry.cash ?? 0) > 0 && <span className="text-green-600">C:{entry.cash} </span>}
                {entry && (entry.cc ?? 0) > 0 && <span className="text-purple-600">CC:{entry.cc}</span>}
              </div>
            </div>
          );
        })}
      </div>

      {/* RV Section */}
      <div className="bg-white rounded-xl shadow-sm">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <h3 className="font-semibold text-slate-800">RV Sites</h3>
          <button
            onClick={() => {
              resetForm();
              setEditingEntry(null);
              setEntryForm({ ...entryForm, entry_type: 'rv', room_number: 1 });
              setShowEntryModal(true);
            }}
            className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700"
          >
            + Add RV
          </button>
        </div>

        {/* RV Header */}
        <div className="grid grid-cols-9 gap-2 px-6 py-3 bg-slate-50 text-xs font-semibold text-slate-600">
          <div>Site #</div>
          <div className="col-span-2">Name</div>
          <div>In</div>
          <div>Out</div>
          <div>Rate</div>
          <div>Cash</div>
          <div>CC</div>
          <div>Note</div>
        </div>

        {/* RV Site Rows */}
        {RV_SITES.map((siteNum) => {
          const entry = getEntryForRoom(siteNum, 'rv');
          return (
            <div
              key={`rv-${siteNum}`}
              className="grid grid-cols-9 gap-2 px-6 py-3 border-t border-slate-100 hover:bg-slate-50 cursor-pointer"
              onClick={() => entry && handleEditEntry(entry)}
            >
              <div className="font-medium text-slate-800">RV #{siteNum}</div>
              <div className="col-span-2 text-slate-600 truncate">{entry?.name || ''}</div>
              <div className="text-slate-500 text-sm">
                {entry?.check_in ? dayjs(entry.check_in).format('M/D') : ''}
              </div>
              <div className="text-slate-500 text-sm">
                {entry?.check_out ? dayjs(entry.check_out).format('M/D') : ''}
              </div>
              <div className="text-slate-700">{entry?.rate?.toFixed(2) || '0.00'}</div>
              <div className="text-green-600">{entry?.cash?.toFixed(2) || ''}</div>
              <div className="text-purple-600">{entry?.cc?.toFixed(2) || ''}</div>
              <div className="text-slate-500 text-sm truncate">{entry?.note || ''}</div>
            </div>
          );
        })}
      </div>

      {/* TOTALS Row */}
      <div className="bg-slate-100 rounded-b-xl px-6 py-4 mt-6">
        <div className="flex justify-between items-center">
          <span className="font-bold text-slate-800">TOTALS</span>
          <div className="flex gap-8 text-sm">
            <span>Rate: <strong>{summary.totalRate.toFixed(2)}</strong></span>
            <span>Tx-C: <strong>{summary.totalTaxC.toFixed(2)}</strong></span>
            <span>Tx-S: <strong>{summary.totalTaxS.toFixed(2)}</strong></span>
            <span className="text-green-600">Total: <strong>{summary.total.toFixed(2)}</strong></span>
            <span className="text-blue-600">Cash: <strong>{summary.totalCash.toFixed(2)}</strong></span>
            <span className="text-purple-600">CC: <strong>{summary.totalCC.toFixed(2)}</strong></span>
          </div>
        </div>
      </div>

      {/* Entry Modal */}
      {showEntryModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md">
            <h3 className="text-xl font-bold text-slate-800 mb-6">
              {editingEntry ? 'Edit Entry' : `Add ${entryForm.entry_type === 'guest' ? 'Guest' : 'RV'}`}
            </h3>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSaveEntry();
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  {entryForm.entry_type === 'guest' ? 'Room #' : 'Site #'}
                </label>
                <select
                  value={entryForm.room_number}
                  onChange={(e) =>
                    setEntryForm({ ...entryForm, room_number: Number(e.target.value) })
                  }
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg"
                >
                  {entryForm.entry_type === 'guest' ? (
                    GUEST_ROOMS.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))
                  ) : (
                    RV_SITES.map((s) => (
                      <option key={s} value={s}>
                        RV #{s}
                      </option>
                    ))
                  )}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Name</label>
                <input
                  type="text"
                  value={entryForm.name}
                  onChange={(e) => setEntryForm({ ...entryForm, name: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Check In</label>
                  <input
                    type="date"
                    value={entryForm.check_in}
                    onChange={(e) => setEntryForm({ ...entryForm, check_in: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Check Out</label>
                  <input
                    type="date"
                    value={entryForm.check_out}
                    onChange={(e) => setEntryForm({ ...entryForm, check_out: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Rate</label>
                <input
                  type="number"
                  value={entryForm.rate}
                  onChange={(e) => setEntryForm({ ...entryForm, rate: Number(e.target.value) })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg"
                  step="0.01"
                  min="0"
                />
              </div>

              {entryForm.entry_type === 'guest' ? (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Cash</label>
                    <input
                      type="number"
                      value={entryForm.cash || ''}
                      onChange={(e) =>
                        setEntryForm({ ...entryForm, cash: e.target.value ? Number(e.target.value) : null })
                      }
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg"
                      step="0.01"
                      min="0"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">CC</label>
                    <input
                      type="number"
                      value={entryForm.cc || ''}
                      onChange={(e) =>
                        setEntryForm({ ...entryForm, cc: e.target.value ? Number(e.target.value) : null })
                      }
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg"
                      step="0.01"
                      min="0"
                    />
                  </div>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Cash</label>
                      <input
                        type="number"
                        value={entryForm.cash || ''}
                        onChange={(e) =>
                          setEntryForm({ ...entryForm, cash: e.target.value ? Number(e.target.value) : null })
                        }
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg"
                        step="0.01"
                        min="0"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">CC</label>
                      <input
                        type="number"
                        value={entryForm.cc || ''}
                        onChange={(e) =>
                          setEntryForm({ ...entryForm, cc: e.target.value ? Number(e.target.value) : null })
                        }
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg"
                        step="0.01"
                        min="0"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Note</label>
                    <input
                      type="text"
                      value={entryForm.note}
                      onChange={(e) => setEntryForm({ ...entryForm, note: e.target.value })}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg"
                      placeholder="Refund, Deposit, etc."
                    />
                  </div>
                </>
              )}

              <div className="flex gap-3 pt-4">
                {editingEntry && (
                  <button
                    type="button"
                    onClick={() => handleDeleteEntry(editingEntry.id)}
                    className="px-4 py-2 border border-red-300 text-red-600 rounded-lg font-medium hover:bg-red-50"
                  >
                    Delete
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setShowEntryModal(false);
                    setEditingEntry(null);
                  }}
                  className="flex-1 py-2 border border-slate-300 rounded-lg font-medium hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700"
                >
                  {editingEntry ? 'Update' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
