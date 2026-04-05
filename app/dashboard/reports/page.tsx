'use client';

import { useEffect, useState } from 'react';
import dayjs from 'dayjs';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

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
  tax_c: number;
  tax_s: number;
  pet_fee: number;
  pet_count: number;
  extra_charges: any[];
  subtotal: number;
  total: number;
  cash: number | null;
  cc: number | null;
  note: string | null;
  is_refund: boolean;
  refund_amount: number;
  status: string;
}

export default function ReportsPage() {
  const [selectedMonth, setSelectedMonth] = useState(dayjs().format('YYYY-MM'));
  const [selectedYear, setSelectedYear] = useState(dayjs().format('YYYY'));
  const [reportType, setReportType] = useState<'monthly' | 'weekly' | 'daily'>('monthly');
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchEntries();
  }, [selectedMonth]);

  const fetchEntries = async () => {
    try {
      const res = await fetch(`/api/entries?month=${selectedMonth}`);
      if (res.ok) {
        const data = await res.json();
        setEntries(data);
      }
    } catch (error) {
      console.error('Error fetching entries:', error);
    }
  };




  const getMonthlySummary = () => {
    const guestEntries = entries.filter((e) => e.entry_type === 'guest' && e.status === 'active');
    const rvEntries = entries.filter((e) => e.entry_type === 'rv' && e.status === 'active');

    return {
      totalGuestRooms: guestEntries.length,
      totalRVSites: rvEntries.length,
      totalGuestRevenue: guestEntries.reduce((sum, e) => sum + e.subtotal, 0),
      totalGuestTaxC: guestEntries.reduce((sum, e) => sum + e.tax_c, 0),
      totalGuestTaxS: guestEntries.reduce((sum, e) => sum + e.tax_s, 0),
      totalGuestPetFees: guestEntries.reduce((sum, e) => sum + e.pet_fee, 0),
      totalGuestExtra: guestEntries.reduce((sum, e) => sum + (e.extra_charges?.reduce((s, ec) => s + ec.amount, 0) || 0), 0),
      totalGuest: guestEntries.reduce((sum, e) => sum + e.total, 0),
      totalRV: rvEntries.reduce((sum, e) => sum + e.total, 0),
      totalCash: entries.reduce((sum, e) => sum + (e.cash || 0), 0),
      totalCC: entries.reduce((sum, e) => sum + (e.cc || 0), 0),
      totalRefunds: entries.filter((e) => e.is_refund).reduce((sum, e) => sum + e.total, 0),
      netTotal: entries.reduce((sum, e) => sum + e.total, 0),
    };
  };

  const summary = getMonthlySummary();

  const exportToExcel = () => {
    setLoading(true);
    try {
      const wb = XLSX.utils.book_new();
      const monthName = dayjs(selectedMonth + '-01').format('MMMM YYYY');
      const year = selectedMonth.split('-')[0];
      const daysInMonth = dayjs(selectedMonth + '-01').daysInMonth();

      // Create daily data array
      const dailyData: any[] = [];

      // Title row
      dailyData.push([`American Inn and RV Park - ${monthName}`]);
      dailyData.push([`Date: ${monthName}`, '', '', '', '', '', '', '', '', '', '', 'Month of ________________________________']);

      // Guest Rooms header
      dailyData.push([
        'Room#', 'Name', 'In', 'Out', 'Rate', 'Tx-C7%', 'Tx-S6%', 'Total', 'Cash', 'CC',
        '', 'Guest Rooms', '', '', '', '', '', '', '', 'RV', '', '', '', 'TOTALS'
      ]);

      // Process each day of the month
      for (let day = 1; day <= daysInMonth; day++) {
        const date = dayjs(`${selectedMonth}-${day.toString().padStart(2, '0')}`).format('YYYY-MM-DD');
        const dayEntries = entries.filter((e) => e.date === date);

        // For each room, check if there's an entry
        GUEST_ROOMS.forEach((roomNum) => {
          const entry = dayEntries.find((e) => e.entry_type === 'guest' && e.room_number === String(roomNum));

          if (entry) {
            dailyData.push([
              roomNum,
              entry.customer_name || '',
              entry.check_in ? dayjs(entry.check_in).format('M/D') : '',
              entry.check_out ? dayjs(entry.check_out).format('M/D') : '',
              entry.room_rate,
              entry.tax_c,
              entry.tax_s,
              entry.subtotal,
              entry.cash || '',
              entry.cc || '',
            ]);
          }
        });
      }

      // Totals row
      dailyData.push([
        '', '', 'TOTAL', '',
        summary.totalGuestRevenue,
        summary.totalGuestTaxC,
        summary.totalGuestTaxS,
        summary.totalGuest,
        summary.totalCash,
        summary.totalCC,
      ]);

      const ws = XLSX.utils.aoa_to_sheet(dailyData);
      XLSX.utils.book_append_sheet(wb, ws, monthName.substring(0, 3));

      XLSX.writeFile(wb, `American_Inn_${monthName.replace(' ', '_')}.xlsx`);
    } catch (error) {
      console.error('Error exporting Excel:', error);
      alert('Error exporting Excel file');
    } finally {
      setLoading(false);
    }
  };

  const exportToPDF = () => {
    setLoading(true);
    try {
      const doc = new jsPDF();
      const monthName = dayjs(selectedMonth + '-01').format('MMMM YYYY');

      // Title
      doc.setFontSize(20);
      doc.setFont('helvetica', 'bold');
      doc.text('American Inn and RV Park', 105, 20, { align: 'center' });

      doc.setFontSize(14);
      doc.setFont('helvetica', 'normal');
      doc.text(`Monthly Report - ${monthName}`, 105, 30, { align: 'center' });

      // Summary Section
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('Summary', 14, 45);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);

      const summaryLines = [
        `Total Guest Revenue: $${summary.totalGuest.toFixed(2)}`,
        `Total RV Revenue: $${summary.totalRV.toFixed(2)}`,
        `City Tax (7%): $${summary.totalGuestTaxC.toFixed(2)}`,
        `State Tax (6%): $${summary.totalGuestTaxS.toFixed(2)}`,
        `Pet Fees: $${summary.totalGuestPetFees.toFixed(2)}`,
        `Total Cash: $${summary.totalCash.toFixed(2)}`,
        `Total Credit Card: $${summary.totalCC.toFixed(2)}`,
        `Refunds: $${Math.abs(summary.totalRefunds).toFixed(2)}`,
        `Net Total: $${summary.netTotal.toFixed(2)}`,
      ];

      summaryLines.forEach((line, i) => {
        doc.text(line, 14, 55 + i * 7);
      });

      // Guest Rooms Table
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('Guest Rooms', 14, 130);

      const guestRows = GUEST_ROOMS.map((roomNum) => {
        const roomEntries = entries.filter(
          (e) => e.entry_type === 'guest' && e.room_number === String(roomNum) && e.status === 'active'
        );
        const totalRate = roomEntries.reduce((sum, e) => sum + e.room_rate, 0);
        const totalCash = roomEntries.reduce((sum, e) => sum + (e.cash || 0), 0);
        const totalCC = roomEntries.reduce((sum, e) => sum + (e.cc || 0), 0);
        return [roomNum, roomEntries.length, `$${totalRate.toFixed(2)}`, `$${totalCash.toFixed(2)}`, `$${totalCC.toFixed(2)}`];
      });

      autoTable(doc, {
        startY: 135,
        head: [['Room #', 'Stays', 'Total Rate', 'Cash', 'CC']],
        body: guestRows,
        theme: 'striped',
        headStyles: { fillColor: [45, 93, 47] },
      });

      // RV Sites Table
      const finalY = (doc as any).lastAutoTable.finalY || 150;
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('RV Sites', 14, finalY + 15);

      const rvRows = RV_SITES.map((siteNum) => {
        const siteEntries = entries.filter(
          (e) => e.entry_type === 'rv' && e.site_number === String(siteNum) && e.status === 'active'
        );
        const totalRate = siteEntries.reduce((sum, e) => sum + e.room_rate, 0);
        return [`RV # ${siteNum}`, siteEntries.length, `$${totalRate.toFixed(2)}`];
      });

      autoTable(doc, {
        startY: finalY + 20,
        head: [['Site #', 'Stays', 'Total Rate']],
        body: rvRows,
        theme: 'striped',
        headStyles: { fillColor: [59, 130, 246] },
      });

      // Footer
      doc.setFontSize(8);
      doc.setTextColor(128);
      doc.text(
        `Generated on ${dayjs().format('MMMM D, YYYY')} - Silk PMS`,
        105,
        doc.internal.pageSize.getHeight() - 10,
        { align: 'center' }
      );

      doc.save(`American_Inn_Report_${monthName.replace(' ', '_')}.pdf`);
    } catch (error) {
      console.error('Error exporting PDF:', error);
      alert('Error exporting PDF file');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Reports</h1>
          <p className="text-slate-400">Generate reports for your accountant</p>
        </div>
      </div>

      {/* Report Type & Date Selection */}
      <div className="bg-slate-900 rounded-xl p-6 border border-slate-800">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Report Type</label>
            <div className="flex gap-2">
              {(['monthly', 'weekly', 'daily'] as const).map((type) => (
                <button
                  key={type}
                  onClick={() => setReportType(type)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                    reportType === type
                      ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                      : 'bg-slate-800 text-slate-400 border border-slate-700 hover:text-white'
                  }`}
                >
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              {reportType === 'monthly' ? 'Month' : reportType === 'weekly' ? 'Week Starting' : 'Date'}
            </label>
            {reportType === 'monthly' ? (
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="w-full px-4 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            ) : reportType === 'weekly' ? (
              <input
                type="date"
                value={selectedMonth + '-01'}
                onChange={(e) => setSelectedMonth(dayjs(e.target.value).format('YYYY-MM'))}
                className="w-full px-4 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            ) : (
              <input
                type="date"
                value={selectedMonth + '-01'}
                onChange={(e) => setSelectedMonth(dayjs(e.target.value).format('YYYY-MM-DD'))}
                className="w-full px-4 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Year</label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="w-full px-4 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              {[2024, 2025, 2026, 2027].map((year) => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-slate-900 rounded-xl p-6 border border-slate-800">
          <p className="text-sm text-slate-400">Total Revenue</p>
          <p className="text-3xl font-bold text-amber-400">${summary.netTotal.toFixed(2)}</p>
        </div>
        <div className="bg-slate-900 rounded-xl p-6 border border-slate-800">
          <p className="text-sm text-slate-400">Guest Revenue</p>
          <p className="text-2xl font-bold text-white">${summary.totalGuest.toFixed(2)}</p>
        </div>
        <div className="bg-slate-900 rounded-xl p-6 border border-slate-800">
          <p className="text-sm text-slate-400">RV Revenue</p>
          <p className="text-2xl font-bold text-blue-400">${summary.totalRV.toFixed(2)}</p>
        </div>
        <div className="bg-slate-900 rounded-xl p-6 border border-slate-800">
          <p className="text-sm text-slate-400">Guest Rooms Sold</p>
          <p className="text-2xl font-bold text-white">{summary.totalGuestRooms}</p>
        </div>
        <div className="bg-slate-900 rounded-xl p-6 border border-slate-800">
          <p className="text-sm text-slate-400">RV Sites Used</p>
          <p className="text-2xl font-bold text-white">{summary.totalRVSites}</p>
        </div>
        <div className="bg-slate-900 rounded-xl p-6 border border-slate-800">
          <p className="text-sm text-slate-400">Cash</p>
          <p className="text-2xl font-bold text-green-400">${summary.totalCash.toFixed(2)}</p>
        </div>
        <div className="bg-slate-900 rounded-xl p-6 border border-slate-800">
          <p className="text-sm text-slate-400">Credit Card</p>
          <p className="text-2xl font-bold text-purple-400">${summary.totalCC.toFixed(2)}</p>
        </div>
        <div className="bg-slate-900 rounded-xl p-6 border border-slate-800">
          <p className="text-sm text-slate-400">Refunds</p>
          <p className="text-2xl font-bold text-red-400">${Math.abs(summary.totalRefunds).toFixed(2)}</p>
        </div>
      </div>

      {/* Tax Breakdown */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-slate-900 rounded-xl p-6 border border-slate-800">
          <p className="text-sm text-slate-400">City Tax (7%)</p>
          <p className="text-xl font-bold text-white">${summary.totalGuestTaxC.toFixed(2)}</p>
        </div>
        <div className="bg-slate-900 rounded-xl p-6 border border-slate-800">
          <p className="text-sm text-slate-400">State Tax (6%)</p>
          <p className="text-xl font-bold text-white">${summary.totalGuestTaxS.toFixed(2)}</p>
        </div>
        <div className="bg-slate-900 rounded-xl p-6 border border-slate-800">
          <p className="text-sm text-slate-400">Pet Fees Collected</p>
          <p className="text-xl font-bold text-white">${summary.totalGuestPetFees.toFixed(2)}</p>
        </div>
      </div>

      {/* Export Buttons */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <button
          onClick={exportToExcel}
          disabled={loading}
          className="flex items-center justify-center gap-3 p-6 rounded-xl bg-green-600/10 border border-green-600/20 hover:bg-green-600/20 transition disabled:opacity-50"
        >
          <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <div className="text-left">
            <p className="font-semibold text-white">Export to Excel</p>
            <p className="text-sm text-slate-400">Download {dayjs(selectedMonth + '-01').format('MMMM YYYY')} data</p>
          </div>
        </button>

        <button
          onClick={exportToPDF}
          disabled={loading}
          className="flex items-center justify-center gap-3 p-6 rounded-xl bg-red-600/10 border border-red-600/20 hover:bg-red-600/20 transition disabled:opacity-50"
        >
          <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
          <div className="text-left">
            <p className="font-semibold text-white">Export to PDF</p>
            <p className="text-sm text-slate-400">Generate formatted report</p>
          </div>
        </button>
      </div>

      {/* Reset Section */}
      <div className="bg-slate-900 rounded-xl p-6 border border-slate-800">
        <h3 className="text-lg font-semibold text-white mb-4">System Reset</h3>
        <p className="text-sm text-slate-400 mb-4">
          Yearly reset creates a backup of all data before clearing entries. Factory reset deletes everything.
        </p>
        <div className="flex flex-col sm:flex-row gap-4">
          <button
            onClick={() => {
              if (confirm('This will create a backup and clear all entries for the year. Continue?')) {
                alert('Yearly reset would create backup and clear data.');
              }
            }}
            className="px-4 py-2 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20 hover:bg-amber-500/20 transition"
          >
            Yearly Reset
          </button>
          <button
            onClick={() => {
              if (confirm('Factory reset will delete ALL data including users and settings. This cannot be undone!')) {
                alert('Factory reset would delete all data.');
              }
            }}
            className="px-4 py-2 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition"
          >
            Factory Reset
          </button>
        </div>
      </div>
    </div>
  );
}
