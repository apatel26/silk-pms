'use client';

import { useEffect, useState } from 'react';
import dayjs from 'dayjs';

const GUEST_ROOMS = [101, 102, 103, 104, 105, 106, 107, 108, 109, 110, 111, 112, 201, 202, 203, 204, 205, 206, 207, 208, 209, 210, 211, 212];
const RV_SITES = Array.from({ length: 15 }, (_, i) => i + 1);

interface Entry {
  id: string;
  entry_type: 'guest' | 'rv';
  date: string;
  room_number: string | null;
  site_number: string | null;
  customer_name: string;
  rate_plan_id: string | null;
  check_in: string | null;
  check_out: string | null;
  room_rate: number;
  num_nights: number;
  subtotal: number;
  tax_c: number;
  tax_s: number;
  pet_fee: number;
  pet_count: number;
  extra_charges: any[];
  total: number;
  cash: number | null;
  cc: number | null;
  note: string | null;
  is_refund: boolean;
  refund_amount: number;
  status: string;
  group_id: string | null;
  is_group_main: boolean;
}

interface FormData {
  entry_type: 'guest' | 'rv';
  date: string;
  room_number: string;
  site_number: string;
  customer_name: string;
  rate_plan: 'standard' | 'custom';
  custom_rate: number;
  check_in: string;
  check_out: string;
  pet_count: number;
  pet_fee_type: 'default' | 'custom';
  custom_pet_fee: number;
  extra_charges: { description: string; amount: number }[];
  cash: number;
  cc: number;
  note: string;
  is_group: boolean;
  group_rooms: string[];
}

const DEFAULT_PET_FEE = 20;

export default function EntriesPage() {
  const [selectedDate, setSelectedDate] = useState(dayjs().format('YYYY-MM-DD'));
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingEntry, setEditingEntry] = useState<Entry | null>(null);
  const [view, setView] = useState<'guests' | 'rv'>('guests');

  const [formData, setFormData] = useState<FormData>({
    entry_type: 'guest',
    date: dayjs().format('YYYY-MM-DD'),
    room_number: '101',
    site_number: '1',
    customer_name: '',
    rate_plan: 'standard',
    custom_rate: 70,
    check_in: dayjs().format('YYYY-MM-DD'),
    check_out: dayjs().add(1, 'day').format('YYYY-MM-DD'),
    pet_count: 0,
    pet_fee_type: 'default',
    custom_pet_fee: 20,
    extra_charges: [],
    cash: 0,
    cc: 0,
    note: '',
    is_group: false,
    group_rooms: [],
  });

  useEffect(() => {
    fetchEntries();
  }, [selectedDate]);

  const fetchEntries = async () => {
    try {
      const res = await fetch(`/api/entries?date=${selectedDate}`);
      if (res.ok) {
        const data = await res.json();
        setEntries(data);
      }
    } catch (error) {
      console.error('Error fetching entries:', error);
    } finally {
      setLoading(false);
    }
  };

  const getEntryForRoom = (roomNum: number) => {
    return entries.find(
      (e) => e.entry_type === 'guest' && e.room_number === String(roomNum) && e.status === 'active'
    );
  };

  const getEntryForSite = (siteNum: number) => {
    return entries.find(
      (e) => e.entry_type === 'rv' && e.site_number === String(siteNum) && e.status === 'active'
    );
  };

  const getSummary = () => {
    const guestEntries = entries.filter((e) => e.entry_type === 'guest' && e.status === 'active');
    const rvEntries = entries.filter((e) => e.entry_type === 'rv' && e.status === 'active');

    return {
      numGuestRooms: guestEntries.length,
      numRVSites: rvEntries.length,
      totalGuest: guestEntries.reduce((sum, e) => sum + e.total, 0),
      totalRV: rvEntries.reduce((sum, e) => sum + e.total, 0),
      totalCash: entries.reduce((sum, e) => sum + (e.cash || 0), 0),
      totalCC: entries.reduce((sum, e) => sum + (e.cc || 0), 0),
    };
  };

  const summary = getSummary();

  const calculateTotal = () => {
    const rate = formData.rate_plan === 'custom' ? formData.custom_rate : 70;

    // Calculate number of nights
    const checkIn = dayjs(formData.check_in);
    const checkOut = dayjs(formData.check_out);
    const nights = checkOut.diff(checkIn, 'day');
    const numNights = nights > 0 ? nights : 1;

    // Calculate total for all nights
    const subtotalForNights = rate * numNights;
    const taxC = subtotalForNights * 0.07;
    const taxS = subtotalForNights * 0.06;
    const subtotal = subtotalForNights + taxC + taxS;

    const petFee = formData.pet_count > 0
      ? (formData.pet_fee_type === 'default'
          ? DEFAULT_PET_FEE * formData.pet_count * numNights
          : formData.custom_pet_fee * formData.pet_count * numNights)
      : 0;

    // Extra charges can be positive (charge) or negative (credit/refund)
    const extraCharges = formData.extra_charges.reduce((sum, ec) => sum + ec.amount, 0);

    return subtotal + petFee + extraCharges;
  };

  const handleSubmit = async () => {
    const rate = formData.rate_plan === 'custom' ? formData.custom_rate : 70;

    // Calculate number of nights
    const checkIn = dayjs(formData.check_in);
    const checkOut = dayjs(formData.check_out);
    const nights = checkOut.diff(checkIn, 'day');
    const numNights = nights > 0 ? nights : 1;

    // Room rate is per night, but subtotal/total is for all nights
    const subtotalForNights = rate * numNights;
    const petFee = formData.pet_count > 0
      ? (formData.pet_fee_type === 'default'
          ? DEFAULT_PET_FEE * formData.pet_count * numNights
          : formData.custom_pet_fee * formData.pet_count * numNights)
      : 0;

    // Generate a single group_id for all rooms in this group
    const groupId = formData.is_group && formData.group_rooms.length > 0 ? `group_${Date.now()}` : null;

    const createPayload = (roomNum: string, isMainRoom: boolean) => ({
      entry_type: formData.entry_type,
      date: formData.date,
      room_number: formData.entry_type === 'guest' ? roomNum : null,
      site_number: formData.entry_type === 'rv' ? roomNum : null,
      customer_name: formData.customer_name,
      rate_plan_id: null,
      check_in: formData.check_in || null,
      check_out: formData.check_out || null,
      room_rate: rate,
      num_nights: numNights,
      subtotal: subtotalForNights,
      pet_fee: isMainRoom ? petFee : 0, // Only charge pet fee on main room
      pet_count: isMainRoom ? formData.pet_count : 0,
      extra_charges: isMainRoom ? formData.extra_charges : [],
      cash: isMainRoom ? (formData.cash || null) : null,
      cc: isMainRoom ? (formData.cc || null) : null,
      note: formData.note || null,
      is_refund: false,
      refund_amount: 0,
      status: 'active',
      group_id: groupId,
      is_group_main: isMainRoom ? true : false,
    });

    try {
      let success = false;

      if (editingEntry) {
        const res = await fetch(`/api/entries/${editingEntry.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(createPayload(formData.room_number, true)),
        });
        success = res.ok;
      } else {
        // Create main room entry
        const mainRes = await fetch('/api/entries', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(createPayload(formData.room_number, true)),
        });
        success = mainRes.ok;

        // Create group room entries
        if (success && formData.is_group && formData.group_rooms.length > 0) {
          for (const groupRoom of formData.group_rooms) {
            const groupRes = await fetch('/api/entries', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(createPayload(groupRoom, false)),
            });
            if (!groupRes.ok) {
              success = false;
              break;
            }
          }
        }
      }

      if (success) {
        resetForm();
        fetchEntries();
      } else {
        alert('Failed to save entry. Please try again.\n\nIf the problem persists, please refresh the page.');
      }
    } catch (error) {
      console.error('Error saving entry:', error);
      alert('Error saving entry: ' + String(error));
    }
  };

  const handleEdit = (entry: Entry) => {
    setEditingEntry(entry);
    setFormData({
      entry_type: entry.entry_type,
      date: entry.date,
      room_number: entry.room_number || '101',
      site_number: entry.site_number || '1',
      customer_name: entry.customer_name || '',
      rate_plan: 'standard',
      custom_rate: entry.room_rate,
      check_in: entry.check_in || '',
      check_out: entry.check_out || '',
      pet_count: entry.pet_count,
      pet_fee_type: 'default',
      custom_pet_fee: 20,
      extra_charges: entry.extra_charges || [],
      cash: entry.cash || 0,
      cc: entry.cc || 0,
      note: entry.note || '',
      is_group: !!entry.group_id,
      group_rooms: [],
    });
    setView(entry.entry_type === 'guest' ? 'guests' : 'rv');
    setShowModal(true);
  };

  const resetForm = () => {
    setShowModal(false);
    setEditingEntry(null);
    setFormData({
      entry_type: 'guest',
      date: dayjs().format('YYYY-MM-DD'),
      room_number: '101',
      site_number: '1',
      customer_name: '',
      rate_plan: 'standard',
      custom_rate: 70,
      check_in: dayjs().format('YYYY-MM-DD'),
      check_out: dayjs().add(1, 'day').format('YYYY-MM-DD'),
      pet_count: 0,
      pet_fee_type: 'default',
      custom_pet_fee: 20,
      extra_charges: [],
      cash: 0,
      cc: 0,
      note: '',
      is_group: false,
      group_rooms: [],
    });
  };

  const addExtraCharge = () => {
    setFormData({
      ...formData,
      extra_charges: [...formData.extra_charges, { description: '', amount: 0 }],
    });
  };

  const removeExtraCharge = (index: number) => {
    setFormData({
      ...formData,
      extra_charges: formData.extra_charges.filter((_, i) => i !== index),
    });
  };

  const updateExtraCharge = (index: number, field: 'description' | 'amount', value: string | number) => {
    const updated = [...formData.extra_charges];
    updated[index] = { ...updated[index], [field]: value };
    setFormData({ ...formData, extra_charges: updated });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Daily Entry</h1>
          <p className="text-slate-400">{dayjs(selectedDate).format('dddd, MMMM D, YYYY')}</p>
        </div>
        <div className="flex items-center gap-3">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-4 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
          <button
            onClick={() => {
              resetForm();
              setShowModal(true);
            }}
            className="px-4 py-2 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 text-slate-900 font-semibold hover:from-amber-400 hover:to-amber-500 transition"
          >
            + Add Entry
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4">
        <div className="bg-slate-900 rounded-xl p-4 border border-slate-800">
          <p className="text-sm text-slate-400">Guest Rooms</p>
          <p className="text-2xl font-bold text-white">{summary.numGuestRooms}</p>
        </div>
        <div className="bg-slate-900 rounded-xl p-4 border border-slate-800">
          <p className="text-sm text-slate-400">RV Sites</p>
          <p className="text-2xl font-bold text-white">{summary.numRVSites}</p>
        </div>
        <div className="bg-slate-900 rounded-xl p-4 border border-slate-800">
          <p className="text-sm text-slate-400">Guest Total</p>
          <p className="text-2xl font-bold text-amber-400">${summary.totalGuest.toFixed(2)}</p>
        </div>
        <div className="bg-slate-900 rounded-xl p-4 border border-slate-800">
          <p className="text-sm text-slate-400">RV Total</p>
          <p className="text-2xl font-bold text-blue-400">${summary.totalRV.toFixed(2)}</p>
        </div>
        <div className="bg-slate-900 rounded-xl p-4 border border-slate-800">
          <p className="text-sm text-slate-400">Cash</p>
          <p className="text-2xl font-bold text-green-400">${summary.totalCash.toFixed(2)}</p>
        </div>
        <div className="bg-slate-900 rounded-xl p-4 border border-slate-800">
          <p className="text-sm text-slate-400">Credit Card</p>
          <p className="text-2xl font-bold text-purple-400">${summary.totalCC.toFixed(2)}</p>
        </div>
      </div>

      {/* View Toggle */}
      <div className="flex gap-2">
        <button
          onClick={() => setView('guests')}
          className={`px-4 py-2 rounded-lg font-medium transition ${
            view === 'guests'
              ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
              : 'bg-slate-800 text-slate-400 border border-slate-700 hover:text-white'
          }`}
        >
          Guest Rooms (101-212)
        </button>
        <button
          onClick={() => setView('rv')}
          className={`px-4 py-2 rounded-lg font-medium transition ${
            view === 'rv'
              ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
              : 'bg-slate-800 text-slate-400 border border-slate-700 hover:text-white'
          }`}
        >
          RV Sites (1-15)
        </button>
      </div>

      {/* Guest Rooms Grid */}
      {view === 'guests' && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {GUEST_ROOMS.map((roomNum) => {
            const entry = getEntryForRoom(roomNum);
            return (
              <button
                key={roomNum}
                onClick={() => entry ? handleEdit(entry) : (resetForm(), setFormData({ ...formData, entry_type: 'guest', room_number: String(roomNum) }), setShowModal(true))}
                className={`relative p-4 rounded-xl border transition ${
                  entry
                    ? 'bg-amber-500/10 border-amber-500/30 hover:bg-amber-500/20'
                    : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                }`}
              >
                <p className="text-lg font-bold text-white">{roomNum}</p>
                {entry ? (
                  <div className="mt-2 text-left">
                    <p className="text-sm text-white truncate">{entry.customer_name || 'Guest'}</p>
                    <p className={`text-sm ${entry.is_refund ? 'text-red-400' : 'text-amber-400'}`}>
                      ${entry.is_refund ? Math.abs(entry.total).toFixed(2) : entry.total.toFixed(2)}
                    </p>
                    {entry.pet_count > 0 && <p className="text-xs text-slate-400">🐾 x{entry.pet_count}</p>}
                    {entry.is_refund && <p className="text-xs text-red-400 font-medium">REFUND</p>}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 mt-2">Tap to add</p>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* RV Sites Grid */}
      {view === 'rv' && (
        <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-10 gap-3">
          {RV_SITES.map((siteNum) => {
            const entry = getEntryForSite(siteNum);
            return (
              <button
                key={siteNum}
                onClick={() => entry ? handleEdit(entry) : (resetForm(), setFormData({ ...formData, entry_type: 'rv', site_number: String(siteNum) }), setShowModal(true))}
                className={`relative p-3 rounded-xl border transition ${
                  entry
                    ? 'bg-blue-500/10 border-blue-500/30 hover:bg-blue-500/20'
                    : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                }`}
              >
                <p className="text-sm font-bold text-white">RV {siteNum}</p>
                {entry ? (
                  <div className="mt-1 text-left">
                    <p className="text-xs text-white truncate">{entry.customer_name || 'Guest'}</p>
                    <p className={`text-xs ${entry.is_refund ? 'text-red-400' : 'text-blue-400'}`}>
                      ${entry.is_refund ? Math.abs(entry.total).toFixed(2) : entry.total.toFixed(2)}
                    </p>
                    {entry.is_refund && <p className="text-xs text-red-400 font-medium">REFUND</p>}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 mt-1">Tap to add</p>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Entry Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto border border-slate-700">
            <div className="sticky top-0 bg-slate-900 px-6 py-4 border-b border-slate-700 flex items-center justify-between">
              <h3 className="text-xl font-bold text-white">
                {editingEntry ? 'Edit Entry' : 'Add Entry'}
              </h3>
              <button
                onClick={resetForm}
                className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Entry Type */}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, entry_type: 'guest' })}
                  className={`flex-1 py-3 rounded-lg font-medium transition ${
                    formData.entry_type === 'guest'
                      ? 'bg-amber-500 text-slate-900'
                      : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  Guest Room
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, entry_type: 'rv' })}
                  className={`flex-1 py-3 rounded-lg font-medium transition ${
                    formData.entry_type === 'rv'
                      ? 'bg-blue-500 text-slate-900'
                      : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  RV Site
                </button>
              </div>

              {/* Room/Site Selection */}
              {formData.entry_type === 'guest' ? (
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Room Number</label>
                  <select
                    value={formData.room_number}
                    onChange={(e) => setFormData({ ...formData, room_number: e.target.value })}
                    className="w-full px-4 py-3 rounded-lg bg-slate-800 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    {GUEST_ROOMS.map((r) => (
                      <option key={r} value={r}>Room {r}</option>
                    ))}
                  </select>
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">RV Site</label>
                  <select
                    value={formData.site_number}
                    onChange={(e) => setFormData({ ...formData, site_number: e.target.value })}
                    className="w-full px-4 py-3 rounded-lg bg-slate-800 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {RV_SITES.map((s) => (
                      <option key={s} value={s}>RV Site {s}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Group Entry Toggle */}
              {formData.entry_type === 'guest' && (
                <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.is_group}
                      onChange={(e) => setFormData({ ...formData, is_group: e.target.checked, group_rooms: [] })}
                      className="w-5 h-5 rounded border-slate-600 bg-slate-700 text-amber-500 focus:ring-amber-500"
                    />
                    <div>
                      <span className="text-white font-medium">Group Entry</span>
                      <p className="text-xs text-slate-400">One guest booking multiple rooms</p>
                    </div>
                  </label>

                  {formData.is_group && (
                    <div className="mt-4">
                      <label className="block text-sm font-medium text-slate-300 mb-2">Additional Rooms</label>
                      <div className="grid grid-cols-4 gap-2 max-h-40 overflow-y-auto">
                        {GUEST_ROOMS.filter(r => r !== parseInt(formData.room_number)).map((r) => (
                          <label key={r} className="flex items-center gap-2 p-2 rounded bg-slate-800 hover:bg-slate-700 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={formData.group_rooms.includes(String(r))}
                              onChange={(e) => {
                                const rooms = e.target.checked
                                  ? [...formData.group_rooms, String(r)]
                                  : formData.group_rooms.filter(gr => gr !== String(r));
                                setFormData({ ...formData, group_rooms: rooms });
                              }}
                              className="w-4 h-4 rounded border-slate-600 bg-slate-700 text-amber-500"
                            />
                            <span className="text-white text-sm">{r}</span>
                          </label>
                        ))}
                      </div>
                      {formData.group_rooms.length > 0 && (
                        <p className="mt-2 text-sm text-amber-400">
                          + {formData.group_rooms.length} additional room(s)
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Date */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Date</label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className="w-full px-4 py-3 rounded-lg bg-slate-800 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              {/* Customer Name */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Guest Name</label>
                <input
                  type="text"
                  value={formData.customer_name}
                  onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
                  className="w-full px-4 py-3 rounded-lg bg-slate-800 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  placeholder="Enter guest name"
                />
              </div>

              {/* Check In/Out */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Check In</label>
                  <input
                    type="date"
                    value={formData.check_in}
                    onChange={(e) => setFormData({ ...formData, check_in: e.target.value })}
                    className="w-full px-4 py-3 rounded-lg bg-slate-800 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Check Out</label>
                  <input
                    type="date"
                    value={formData.check_out}
                    onChange={(e) => setFormData({ ...formData, check_out: e.target.value })}
                    className="w-full px-4 py-3 rounded-lg bg-slate-800 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              {/* Rate Plan */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Rate</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, rate_plan: 'standard' })}
                    className={`flex-1 py-3 rounded-lg font-medium transition ${
                      formData.rate_plan === 'standard'
                        ? 'bg-amber-500 text-slate-900'
                        : 'bg-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    Standard ($70)
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, rate_plan: 'custom' })}
                    className={`flex-1 py-3 rounded-lg font-medium transition ${
                      formData.rate_plan === 'custom'
                        ? 'bg-amber-500 text-slate-900'
                        : 'bg-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    Custom Rate
                  </button>
                </div>
                {formData.rate_plan === 'custom' && (
                  <input
                    type="number"
                    value={formData.custom_rate}
                    onChange={(e) => setFormData({ ...formData, custom_rate: parseFloat(e.target.value) || 0 })}
                    className="mt-2 w-full px-4 py-3 rounded-lg bg-slate-800 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                    placeholder="Enter custom rate"
                    step="0.01"
                  />
                )}
              </div>

              {/* Pet Fees */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Pet Fees</label>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <input
                      type="number"
                      value={formData.pet_count}
                      onChange={(e) => setFormData({ ...formData, pet_count: parseInt(e.target.value) || 0 })}
                      className="w-full px-4 py-3 rounded-lg bg-slate-800 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                      placeholder="# of pets"
                      min="0"
                    />
                  </div>
                  <select
                    value={formData.pet_fee_type}
                    onChange={(e) => setFormData({ ...formData, pet_fee_type: e.target.value as 'default' | 'custom' })}
                    className="w-full px-4 py-3 rounded-lg bg-slate-800 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    <option value="default">$20/pet (default)</option>
                    <option value="custom">Custom amount</option>
                  </select>
                </div>
                {formData.pet_fee_type === 'custom' && formData.pet_count > 0 && (
                  <input
                    type="number"
                    value={formData.custom_pet_fee}
                    onChange={(e) => setFormData({ ...formData, custom_pet_fee: parseFloat(e.target.value) || 0 })}
                    className="mt-2 w-full px-4 py-3 rounded-lg bg-slate-800 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                    placeholder="Custom fee per pet"
                    step="0.01"
                  />
                )}
              </div>

              {/* Extra Charges */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-slate-300">Charges & Credits</label>
                  <button
                    type="button"
                    onClick={addExtraCharge}
                    className="text-sm text-amber-400 hover:text-amber-300"
                  >
                    + Add Charge
                  </button>
                </div>
                {formData.extra_charges.map((ec, index) => (
                  <div key={index} className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={ec.description}
                      onChange={(e) => updateExtraCharge(index, 'description', e.target.value)}
                      className="flex-1 px-4 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                      placeholder={ec.amount < 0 ? "Credit description" : "Charge description"}
                    />
                    <input
                      type="number"
                      value={ec.amount}
                      onChange={(e) => updateExtraCharge(index, 'amount', parseFloat(e.target.value) || 0)}
                      className={`w-24 px-4 py-2 rounded-lg border text-white focus:outline-none focus:ring-2 ${
                        ec.amount < 0 ? 'bg-red-500/20 border-red-500/50 text-red-400 focus:ring-red-500' : 'bg-slate-800 border-slate-700 focus:ring-amber-500'
                      }`}
                      placeholder={ec.amount < 0 ? "-0.00" : "0.00"}
                      step="0.01"
                    />
                    <button
                      type="button"
                      onClick={() => removeExtraCharge(index)}
                      className="px-3 py-2 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
                {formData.extra_charges.some(ec => ec.amount < 0) && (
                  <p className="text-xs text-red-400 mt-1">
                    Credits will reduce the total
                  </p>
                )}
              </div>

              {/* Payment */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Cash</label>
                  <input
                    type="number"
                    value={formData.cash}
                    onChange={(e) => setFormData({ ...formData, cash: parseFloat(e.target.value) || 0 })}
                    className="w-full px-4 py-3 rounded-lg bg-slate-800 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                    placeholder="0.00"
                    step="0.01"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Credit Card</label>
                  <input
                    type="number"
                    value={formData.cc}
                    onChange={(e) => setFormData({ ...formData, cc: parseFloat(e.target.value) || 0 })}
                    className="w-full px-4 py-3 rounded-lg bg-slate-800 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                    placeholder="0.00"
                    step="0.01"
                  />
                </div>
              </div>

              {/* Note */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Note</label>
                <input
                  type="text"
                  value={formData.note}
                  onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                  className="w-full px-4 py-3 rounded-lg bg-slate-800 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  placeholder="Additional notes..."
                />
              </div>

              {/* Total */}
              <div className="bg-slate-800 rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Total</span>
                  <span className={`text-2xl font-bold ${calculateTotal() < 0 ? 'text-red-400' : 'text-amber-400'}`}>
                    ${Math.abs(calculateTotal()).toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                {editingEntry && (
                  <button
                    type="button"
                    onClick={async () => {
                      if (confirm('Delete this entry?')) {
                        await fetch(`/api/entries/${editingEntry.id}`, { method: 'DELETE' });
                        resetForm();
                        fetchEntries();
                      }
                    }}
                    className="px-4 py-3 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 font-medium"
                  >
                    Delete
                  </button>
                )}
                <button
                  type="button"
                  onClick={resetForm}
                  className="flex-1 py-3 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSubmit}
                  className="flex-1 py-3 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 text-slate-900 font-semibold hover:from-amber-400 hover:to-amber-500"
                >
                  {editingEntry ? 'Update' : 'Save Entry'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
