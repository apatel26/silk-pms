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

export default function ReportsPage() {
  const currentYear = dayjs().format('YYYY');
  const [reportType, setReportType] = useState<'monthly' | 'yearly'>('monthly');
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [selectedMonth, setSelectedMonth] = useState(dayjs().format('YYYY-MM'));
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(false);

  // Generate list of years for dropdown (current year + 2 years back)
  const getYearOptions = () => {
    const options = [];
    for (let i = 0; i <= 2; i++) {
      const year = dayjs().subtract(i, 'year').format('YYYY');
      options.push({ value: year, label: year });
    }
    return options;
  };

  // Generate list of months for dropdown
  const getMonthOptions = () => {
    const options = [];
    for (let i = 0; i < 12; i++) {
      const date = dayjs().subtract(i, 'month');
      options.push({
        value: date.format('YYYY-MM'),
        label: date.format('MMMM YYYY'),
      });
    }
    return options;
  };

  useEffect(() => {
    fetchEntries();
  }, [selectedYear, selectedMonth, reportType]);

  const fetchEntries = async () => {
    setLoading(true);
    try {
      let url = '/api/entries?';
      if (reportType === 'yearly') {
        url += `year=${selectedYear}`;
      } else {
        url += `month=${selectedMonth}`;
      }

      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setEntries(Array.isArray(data) ? data : []);
      } else {
        console.error('Failed to fetch entries:', res.status);
        setEntries([]);
      }
    } catch (error) {
      console.error('Error fetching entries:', error);
      setEntries([]);
    } finally {
      setLoading(false);
    }
  };

  const getSummary = () => {
    // For reports, show all entries (not just active) since we're reporting on historical data
    const guestEntries = entries.filter((e) => e.entry_type === 'guest');
    const rvEntries = entries.filter((e) => e.entry_type === 'rv');
    const activeGuestEntries = guestEntries.filter((e) => e.status === 'active');
    const activeRVEntries = rvEntries.filter((e) => e.status === 'active');

    return {
      totalGuestRooms: activeGuestEntries.length,
      totalRVSites: activeRVEntries.length,
      totalGuestRevenue: guestEntries.reduce((sum, e) => sum + (e.subtotal || 0), 0),
      totalGuestTaxC: guestEntries.reduce((sum, e) => sum + (e.tax_c || 0), 0),
      totalGuestTaxS: guestEntries.reduce((sum, e) => sum + (e.tax_s || 0), 0),
      totalGuestPetFees: guestEntries.reduce((sum, e) => sum + (e.pet_fee || 0), 0),
      totalGuestExtra: guestEntries.reduce((sum, e) => sum + (e.extra_charges?.reduce((s, ec) => s + ec.amount, 0) || 0), 0),
      totalGuest: guestEntries.reduce((sum, e) => sum + (e.total || 0), 0),
      totalRV: rvEntries.reduce((sum, e) => sum + (e.total || 0), 0),
      totalCash: entries.reduce((sum, e) => sum + (e.cash || 0), 0),
      totalCC: entries.reduce((sum, e) => sum + (e.cc || 0), 0),
      totalRefunds: entries.filter((e) => e.is_refund).reduce((sum, e) => sum + Math.abs(e.total || 0), 0),
      netTotal: entries.reduce((sum, e) => sum + (e.total || 0), 0),
    };
  };

  const summary = getSummary();

  const exportToExcel = () => {
    setLoading(true);
    try {
      const wb = XLSX.utils.book_new();
      const title = reportType === 'yearly'
        ? `American Inn and RV Park - ${selectedYear} Annual Report`
        : `American Inn and RV Park - ${dayjs(selectedMonth + '-01').format('MMMM YYYY')}`;
      const dateRange = reportType === 'yearly' ? `Year: ${selectedYear}` : `Month: ${dayjs(selectedMonth + '-01').format('MMMM YYYY')}`;

      // Summary sheet
      const summaryData: any[] = [];
      summaryData.push([title]);
      summaryData.push([dateRange]);
      summaryData.push([]);
      summaryData.push(['GUEST ROOMS']);
      summaryData.push(['Total Rooms Sold', summary.totalGuestRooms]);
      summaryData.push(['Total Guest Revenue', `$${summary.totalGuestRevenue.toFixed(2)}`]);
      summaryData.push(['City Tax (7%)', `$${summary.totalGuestTaxC.toFixed(2)}`]);
      summaryData.push(['State Tax (6%)', `$${summary.totalGuestTaxS.toFixed(2)}`]);
      summaryData.push(['Pet Fees', `$${summary.totalGuestPetFees.toFixed(2)}`]);
      summaryData.push(['Extra Charges', `$${summary.totalGuestExtra.toFixed(2)}`]);
      summaryData.push(['Total Guest Revenue', `$${summary.totalGuest.toFixed(2)}`]);
      summaryData.push([]);
      summaryData.push(['RV SITES']);
      summaryData.push(['Total RV Sites Used', summary.totalRVSites]);
      summaryData.push(['Total RV Revenue', `$${summary.totalRV.toFixed(2)}`]);
      summaryData.push([]);
      summaryData.push(['PAYMENT SUMMARY']);
      summaryData.push(['Total Cash', `$${summary.totalCash.toFixed(2)}`]);
      summaryData.push(['Total Credit Card', `$${summary.totalCC.toFixed(2)}`]);
      summaryData.push(['Refunds', `$${summary.totalRefunds.toFixed(2)}`]);
      summaryData.push(['NET TOTAL', `$${summary.netTotal.toFixed(2)}`]);

      const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary');

      // Guest entries detail
      const guestData: any[] = [];
      guestData.push(['Room #', 'Date', 'Guest Name', 'Check In', 'Check Out', 'Nights', 'Rate', 'Subtotal', 'Tax C', 'Tax S', 'Pet Fee', 'Extra', 'Total', 'Cash', 'CC', 'Status']);
      entries.filter(e => e.entry_type === 'guest').forEach(e => {
        guestData.push([
          e.room_number || '',
          e.date,
          e.customer_name || '',
          e.check_in || '',
          e.check_out || '',
          e.num_nights || 1,
          `$${(e.room_rate || 0).toFixed(2)}`,
          `$${(e.subtotal || 0).toFixed(2)}`,
          `$${(e.tax_c || 0).toFixed(2)}`,
          `$${(e.tax_s || 0).toFixed(2)}`,
          `$${(e.pet_fee || 0).toFixed(2)}`,
          `$${(e.extra_charges?.reduce((s, ec) => s + ec.amount, 0) || 0).toFixed(2)}`,
          `$${(e.total || 0).toFixed(2)}`,
          `$${(e.cash || 0).toFixed(2)}`,
          `$${(e.cc || 0).toFixed(2)}`,
          e.status
        ]);
      });

      const wsGuest = XLSX.utils.aoa_to_sheet(guestData);
      XLSX.utils.book_append_sheet(wb, wsGuest, 'Guest Rooms');

      // RV entries detail
      const rvData: any[] = [];
      rvData.push(['Site #', 'Date', 'Guest Name', 'Check In', 'Check Out', 'Nights', 'Rate', 'Total', 'Cash', 'CC', 'Status']);
      entries.filter(e => e.entry_type === 'rv').forEach(e => {
        rvData.push([
          e.site_number || '',
          e.date,
          e.customer_name || '',
          e.check_in || '',
          e.check_out || '',
          e.num_nights || 1,
          `$${(e.room_rate || 0).toFixed(2)}`,
          `$${(e.total || 0).toFixed(2)}`,
          `$${(e.cash || 0).toFixed(2)}`,
          `$${(e.cc || 0).toFixed(2)}`,
          e.status
        ]);
      });

      const wsRV = XLSX.utils.aoa_to_sheet(rvData);
      XLSX.utils.book_append_sheet(wb, wsRV, 'RV Sites');

      const fileName = reportType === 'yearly'
        ? `American_Inn_${selectedYear}_Annual_Report.xlsx`
        : `American_Inn_${dayjs(selectedMonth + '-01').format('MMMM_YYYY')}_Report.xlsx`;
      XLSX.writeFile(wb, fileName);
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
      const title = reportType === 'yearly'
        ? `American Inn and RV Park - ${selectedYear} Annual Report`
        : `American Inn and RV Park - ${dayjs(selectedMonth + '-01').format('MMMM YYYY')} Report`;

      // Title
      doc.setFontSize(20);
      doc.setFont('helvetica', 'bold');
      doc.text(title, 105, 20, { align: 'center' });

      // Summary Section
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('Summary', 14, 40);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);

      const summaryLines = [
        `Total Guest Revenue: $${summary.totalGuest.toFixed(2)}`,
        `Total RV Revenue: $${summary.totalRV.toFixed(2)}`,
        `City Tax (7%): $${summary.totalGuestTaxC.toFixed(2)}`,
        `State Tax (6%): $${summary.totalGuestTaxS.toFixed(2)}`,
        `Pet Fees: $${summary.totalGuestPetFees.toFixed(2)}`,
        `Extra Charges: $${summary.totalGuestExtra.toFixed(2)}`,
        `Total Cash: $${summary.totalCash.toFixed(2)}`,
        `Total Credit Card: $${summary.totalCC.toFixed(2)}`,
        `Refunds: $${summary.totalRefunds.toFixed(2)}`,
        `NET TOTAL: $${summary.netTotal.toFixed(2)}`,
      ];

      summaryLines.forEach((line, i) => {
        doc.text(line, 14, 50 + i * 7);
      });

      // Guest Rooms Table
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('Guest Rooms', 14, 130);

      const guestRows = GUEST_ROOMS.map((roomNum) => {
        const roomEntries = entries.filter(
          (e) => e.entry_type === 'guest' && e.room_number === String(roomNum)
        );
        const totalRate = roomEntries.reduce((sum, e) => sum + (e.subtotal || 0), 0);
        const totalCash = roomEntries.reduce((sum, e) => sum + (e.cash || 0), 0);
        const totalCC = roomEntries.reduce((sum, e) => sum + (e.cc || 0), 0);
        return [roomNum, roomEntries.length, `$${totalRate.toFixed(2)}`, `$${totalCash.toFixed(2)}`, `$${totalCC.toFixed(2)}`];
      });

      autoTable(doc, {
        startY: 135,
        head: [['Room #', 'Stays', 'Total Revenue', 'Cash', 'CC']],
        body: guestRows.filter(row => Number(row[1]) > 0),
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
          (e) => e.entry_type === 'rv' && e.site_number === String(siteNum)
        );
        const totalRate = siteEntries.reduce((sum, e) => sum + (e.total || 0), 0);
        return [`RV # ${siteNum}`, siteEntries.length, `$${totalRate.toFixed(2)}`];
      });

      autoTable(doc, {
        startY: finalY + 20,
        head: [['Site #', 'Stays', 'Total Revenue']],
        body: rvRows.filter(row => Number(row[1]) > 0),
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

      const fileName = reportType === 'yearly'
        ? `American_Inn_${selectedYear}_Annual_Report.pdf`
        : `American_Inn_${dayjs(selectedMonth + '-01').format('MMMM_YYYY')}_Report.pdf`;
      doc.save(fileName);
    } catch (error) {
      console.error('Error exporting PDF:', error);
      alert('Error exporting PDF file');
    } finally {
      setLoading(false);
    }
  };

  const handleYearlyReset = async () => {
    if (!confirm('This will create a backup of all entries and clear all data for the current year. Continue?')) {
      return;
    }

    try {
      const res = await fetch('/api/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'yearly', year: selectedYear }),
      });

      if (res.ok) {
        alert('Yearly reset completed successfully.');
        fetchEntries();
      } else {
        alert('Failed to reset. Please try again.');
      }
    } catch (error) {
      console.error('Error during yearly reset:', error);
      alert('Error during reset: ' + String(error));
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
              {(['monthly', 'yearly'] as const).map((type) => (
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
            <label className="block text-sm font-medium text-slate-300 mb-2">Year</label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="w-full px-4 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              {getYearOptions().map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          {reportType === 'monthly' && (
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Month</label>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="w-full px-4 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                {getMonthOptions().map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        {reportType === 'yearly' && (
          <p className="mt-4 text-sm text-amber-400">
            Showing all entries for {selectedYear} (all months combined)
          </p>
        )}

        <div className="mt-4 flex items-center gap-4">
          <button
            onClick={fetchEntries}
            className="px-4 py-2 rounded-lg bg-blue-600/10 text-blue-400 border border-blue-600/20 hover:bg-blue-600/20 transition"
          >
            Refresh Data
          </button>
          <span className="text-sm text-slate-400">
            {entries.length} entries found
          </span>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4">
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
          <p className="text-sm text-slate-400">Total Entries</p>
          <p className="text-2xl font-bold text-white">{entries.length}</p>
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
          <p className="text-2xl font-bold text-red-400">${summary.totalRefunds.toFixed(2)}</p>
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
            <p className="text-sm text-slate-400">
              {reportType === 'yearly' ? `${selectedYear} Annual Report` : dayjs(selectedMonth + '-01').format('MMMM YYYY')}
            </p>
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

      {/* Yearly Reset Section */}
      <div className="bg-slate-900 rounded-xl p-6 border border-slate-800">
        <h3 className="text-lg font-semibold text-white mb-4">Yearly Reset</h3>
        <p className="text-sm text-slate-400 mb-4">
          Yearly reset creates a backup of all {selectedYear} entries before clearing them. Use this at the end of the year.
        </p>
        <button
          onClick={handleYearlyReset}
          className="px-4 py-2 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20 hover:bg-amber-500/20 transition"
        >
          Reset {selectedYear} Data
        </button>
      </div>

      {/* Entries Table */}
      {entries.length > 0 && (
        <div className="bg-slate-900 rounded-xl p-6 border border-slate-800">
          <h3 className="text-lg font-semibold text-white mb-4">All Entries</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-white">
              <thead>
                <tr className="border-b border-slate-700">
                  <th className="text-left p-2">Date</th>
                  <th className="text-left p-2">Type</th>
                  <th className="text-left p-2">Room/Site</th>
                  <th className="text-left p-2">Guest Name</th>
                  <th className="text-left p-2">Check In</th>
                  <th className="text-left p-2">Check Out</th>
                  <th className="text-right p-2">Nights</th>
                  <th className="text-right p-2">Total</th>
                  <th className="text-left p-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {entries.slice(0, 50).map((entry) => (
                  <tr key={entry.id} className="border-b border-slate-800">
                    <td className="p-2">{entry.date}</td>
                    <td className="p-2">{entry.entry_type === 'guest' ? 'Room' : 'RV'}</td>
                    <td className="p-2">{entry.room_number || entry.site_number || '-'}</td>
                    <td className="p-2">{entry.customer_name || '-'}</td>
                    <td className="p-2">{entry.check_in || '-'}</td>
                    <td className="p-2">{entry.check_out || '-'}</td>
                    <td className="p-2 text-right">{entry.num_nights || 1}</td>
                    <td className="p-2 text-right">${(entry.total || 0).toFixed(2)}</td>
                    <td className="p-2">
                      <span className={`px-2 py-1 rounded text-xs ${
                        entry.status === 'active' ? 'bg-green-500/20 text-green-400' :
                        entry.status === 'checked_out' ? 'bg-blue-500/20 text-blue-400' :
                        'bg-red-500/20 text-red-400'
                      }`}>
                        {entry.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {entries.length > 50 && (
              <p className="text-center text-slate-400 mt-4">
                Showing 50 of {entries.length} entries
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
