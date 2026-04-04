'use client';

import { useEffect, useState } from 'react';
import dayjs from 'dayjs';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

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

export default function ReportsPage() {
  const [selectedMonth, setSelectedMonth] = useState(dayjs().format('YYYY-MM'));
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchEntries();
  }, [selectedMonth]);

  const fetchEntries = async () => {
    try {
      const res = await fetch(`/api/entries?month=${selectedMonth}`);
      const data = await res.json();
      setEntries(data);
    } catch (error) {
      console.error('Error fetching entries:', error);
    }
  };

  // Get entries for a specific day
  const getEntriesForDate = (date: string) => {
    return entries.filter((e) => e.date === date);
  };

  // Get monthly summary
  const getMonthlySummary = () => {
    const monthEntries = entries.filter((e) => {
      const date = dayjs(e.date);
      return date.format('YYYY-MM') === selectedMonth;
    });

    const guestEntries = monthEntries.filter((e) => e.entry_type === 'guest');
    const rvEntries = monthEntries.filter((e) => e.entry_type === 'rv');

    const sum = (arr: Entry[], field: keyof Entry) =>
      arr.reduce((s, e) => s + (Number(e[field]) || 0), 0);

    return {
      guestCount: guestEntries.filter((e) => e.rate > 0).length,
      rvCount: rvEntries.filter((e) => e.rate > 0).length,
      totalRate: sum(monthEntries, 'rate'),
      totalTaxC: sum(monthEntries, 'tax_c'),
      totalTaxS: sum(monthEntries, 'tax_s'),
      total: sum(monthEntries, 'total'),
      totalCash: sum(monthEntries, 'cash'),
      totalCC: sum(monthEntries, 'cc'),
      entries: monthEntries,
    };
  };

  const summary = getMonthlySummary();

  const exportToExcel = () => {
    setLoading(true);
    try {
      const wb = XLSX.utils.book_new();
      const year = selectedMonth.split('-')[0];
      const monthName = dayjs(selectedMonth + '-01').format('MMM YY').toUpperCase();

      // Get days in month
      const daysInMonth = dayjs(selectedMonth + '-01').daysInMonth();

      // Sheet 1: Daily Sheet (matches Excel structure)
      const dailyData: any[] = [];

      // Add date header
      dailyData.push([
        `Date: ${dayjs(selectedMonth + '-01').format('MMMM YYYY')}`,
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        'Month of ____________________________________',
      ]);

      // Guest Rooms header
      dailyData.push([
        'Room#', 'Name', 'In', 'Out', 'Rate', 'Tx-C7%', 'Tx-S6%', 'Total', 'Cash', 'CC',
        '',
        'Guest Rooms',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        'RV',
        '',
        '',
        '',
        'TOTALS',
      ]);

      // Guest room rows
      GUEST_ROOMS.forEach((roomNum) => {
        const roomEntries = entries.filter(
          (e) => e.room_number === roomNum && e.entry_type === 'guest'
        );

        // For each day, create a row
        for (let day = 1; day <= daysInMonth; day++) {
          const date = dayjs(`${selectedMonth}-${day.toString().padStart(2, '0')}`).format('YYYY-MM-DD');
          const entry = roomEntries.find((e) => e.date === date);

          if (entry && entry.rate > 0) {
            dailyData.push([
              roomNum,
              entry.name || '',
              entry.check_in ? dayjs(entry.check_in).format('M/D') : '',
              entry.check_out ? dayjs(entry.check_out).format('M/D') : '',
              entry.rate,
              entry.tax_c,
              entry.tax_s,
              entry.total,
              entry.cash || '',
              entry.cc || '',
            ]);
          } else {
            dailyData.push([roomNum, '', '', '', 0, 0, 0, 0, '', '']);
          }
        }
      });

      // Add totals row for guest rooms
      const guestEntries = entries.filter((e) => e.entry_type === 'guest' && e.rate > 0);
      const guestTotal = guestEntries.reduce((sum, e) => sum + e.total, 0);
      const guestCash = guestEntries.reduce((sum, e) => sum + (e.cash || 0), 0);
      const guestCC = guestEntries.reduce((sum, e) => sum + (e.cc || 0), 0);
      const guestRate = guestEntries.reduce((sum, e) => sum + e.rate, 0);
      const guestTaxC = guestEntries.reduce((sum, e) => sum + e.tax_c, 0);
      const guestTaxS = guestEntries.reduce((sum, e) => sum + e.tax_s, 0);

      // Daily summary section header
      dailyData.push(['', '', '', '', '', '', '', '', '', '', '', 'Date', '# Rms', 'Rate', 'Tx-C 7%', 'Tx-S 6%', 'Total', 'Cash', 'CC']);
      dailyData.push(['', '', '', '', '', '', '', '', '', '', '', '1', guestEntries.filter(e => dayjs(e.date).date() === 1).length, guestRate, guestTaxC, guestTaxS, guestTotal, guestCash, guestCC]);

      // RV Section header
      dailyData.push([
        '', '', '', '', '', '', '', '', '', '',
        '',
        'RV # 1', '', '', '', '', '', '',
      ]);
      dailyData.push([
        'Site #', 'Name', 'In', 'Out', 'Rate', 'Cash', 'CC', 'Total',
      ]);

      // RV rows
      RV_SITES.forEach((siteNum) => {
        const siteEntries = entries.filter(
          (e) => e.room_number === siteNum && e.entry_type === 'rv'
        );

        for (let day = 1; day <= daysInMonth; day++) {
          const date = dayjs(`${selectedMonth}-${day.toString().padStart(2, '0')}`).format('YYYY-MM-DD');
          const entry = siteEntries.find((e) => e.date === date);

          if (entry && entry.rate > 0) {
            dailyData.push([
              `RV # ${siteNum}`,
              entry.name || '',
              entry.check_in ? dayjs(entry.check_in).format('M/D') : '',
              entry.check_out ? dayjs(entry.check_out).format('M/D') : '',
              entry.rate,
              entry.cash || '',
              entry.cc || '',
              entry.note || '',
            ]);
          } else {
            dailyData.push([`RV # ${siteNum}`, '', '', '', '', '', '', '']);
          }
        }
      });

      const wsDaily = XLSX.utils.aoa_to_sheet(dailyData);
      XLSX.utils.book_append_sheet(wb, wsDaily, monthName);

      // Sheet 2: Monthly Summary
      const summaryData = [
        ['Monthly Summary', selectedMonth],
        [''],
        ['Guest Rooms'],
        ['Metric', 'Value'],
        ['Total Revenue', summary.total],
        ['Total Cash', summary.totalCash],
        ['Total CC', summary.totalCC],
        ['City Tax (7%)', summary.totalTaxC],
        ['State Tax (6%)', summary.totalTaxS],
        ['Net Total', summary.total - summary.totalTaxC - summary.totalTaxS],
        [''],
        ['RV Sites'],
        ['Total RV Revenue', summary.entries.filter((e) => e.entry_type === 'rv').reduce((sum, e) => sum + e.total, 0)],
      ];

      const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary');

      XLSX.writeFile(wb, `PMS_${selectedMonth}.xlsx`);
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
      doc.text('Property Management System', 105, 20, { align: 'center' });

      doc.setFontSize(14);
      doc.text(`Monthly Report - ${monthName}`, 105, 30, { align: 'center' });

      // Summary Section
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('Summary', 14, 45);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.text(`Total Revenue: $${summary.total.toFixed(2)}`, 14, 55);
      doc.text(`Total Cash: $${summary.totalCash.toFixed(2)}`, 14, 62);
      doc.text(`Total CC: $${summary.totalCC.toFixed(2)}`, 14, 69);
      doc.text(`City Tax (7%): $${summary.totalTaxC.toFixed(2)}`, 14, 76);
      doc.text(`State Tax (6%): $${summary.totalTaxS.toFixed(2)}`, 14, 83);

      // Guest Rooms Table
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.text('Guest Rooms', 14, 97);

      const guestRows = GUEST_ROOMS.map((roomNum) => {
        const roomEntries = entries.filter(
          (e) => e.room_number === roomNum && e.entry_type === 'guest' && e.rate > 0
        );
        const totalRate = roomEntries.reduce((sum, e) => sum + e.rate, 0);
        const totalCash = roomEntries.reduce((sum, e) => sum + (e.cash || 0), 0);
        const totalCC = roomEntries.reduce((sum, e) => sum + (e.cc || 0), 0);
        return [roomNum, roomEntries.length, `$${totalRate.toFixed(2)}`, `$${totalCash.toFixed(2)}`, `$${totalCC.toFixed(2)}`];
      });

      autoTable(doc, {
        startY: 102,
        head: [['Room #', 'Stays', 'Total Rate', 'Cash', 'CC']],
        body: guestRows,
        theme: 'striped',
        headStyles: { fillColor: [59, 130, 246] },
      });

      // RV Sites Table
      const finalY = (doc as any).lastAutoTable.finalY || 150;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.text('RV Sites', 14, finalY + 15);

      const rvRows = RV_SITES.map((siteNum) => {
        const siteEntries = entries.filter(
          (e) => e.room_number === siteNum && e.entry_type === 'rv' && e.rate > 0
        );
        const totalRate = siteEntries.reduce((sum, e) => sum + e.rate, 0);
        return [`RV # ${siteNum}`, siteEntries.length, `$${totalRate.toFixed(2)}`];
      });

      autoTable(doc, {
        startY: finalY + 20,
        head: [['Site #', 'Stays', 'Total Rate']],
        body: rvRows,
        theme: 'striped',
        headStyles: { fillColor: [34, 197, 94] },
      });

      // Footer
      doc.setFontSize(8);
      doc.setTextColor(128);
      doc.text(
        `Generated on ${dayjs().format('MMMM D, YYYY')}`,
        105,
        doc.internal.pageSize.getHeight() - 10,
        { align: 'center' }
      );

      doc.save(`PMS_Report_${selectedMonth}.pdf`);
    } catch (error) {
      console.error('Error exporting PDF:', error);
      alert('Error exporting PDF file');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Reports</h2>
          <p className="text-slate-500">Export data for your accountant</p>
        </div>
        <div className="flex items-center gap-4">
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="px-4 py-2 border border-slate-300 rounded-lg"
          />
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="text-3xl font-bold text-slate-800">
            ${summary.total.toFixed(2)}
          </div>
          <div className="text-sm text-slate-500 mt-1">Total Revenue</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="text-3xl font-bold text-green-600">
            ${summary.totalCash.toFixed(2)}
          </div>
          <div className="text-sm text-slate-500 mt-1">Cash</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="text-3xl font-bold text-purple-600">
            ${summary.totalCC.toFixed(2)}
          </div>
          <div className="text-sm text-slate-500 mt-1">Credit Card</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="text-3xl font-bold text-slate-800">
            {entries.filter((e) => e.rate > 0).length}
          </div>
          <div className="text-sm text-slate-500 mt-1">Total Entries</div>
        </div>
      </div>

      {/* Export Buttons */}
      <div className="bg-white rounded-xl shadow-sm p-8">
        <h3 className="text-lg font-semibold text-slate-800 mb-6">Export Reports</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="border border-slate-200 rounded-xl p-6 hover:border-green-300 transition">
            <div className="flex items-center gap-4 mb-4">
              <span className="text-4xl">📊</span>
              <div>
                <h4 className="font-semibold text-slate-800">Excel Export</h4>
                <p className="text-sm text-slate-500">
                  Download {dayjs(selectedMonth + '-01').format('MMMM YYYY')} data in your Excel format
                </p>
              </div>
            </div>
            <button
              onClick={exportToExcel}
              disabled={loading}
              className="w-full bg-green-600 text-white py-3 rounded-lg font-medium hover:bg-green-700 transition disabled:opacity-50"
            >
              {loading ? 'Generating...' : 'Download Excel (.xlsx)'}
            </button>
          </div>

          <div className="border border-slate-200 rounded-xl p-6 hover:border-red-300 transition">
            <div className="flex items-center gap-4 mb-4">
              <span className="text-4xl">📄</span>
              <div>
                <h4 className="font-semibold text-slate-800">PDF Report</h4>
                <p className="text-sm text-slate-500">
                  Generate formatted report for your accountant
                </p>
              </div>
            </div>
            <button
              onClick={exportToPDF}
              disabled={loading}
              className="w-full bg-red-600 text-white py-3 rounded-lg font-medium hover:bg-red-700 transition disabled:opacity-50"
            >
              {loading ? 'Generating...' : 'Download PDF Report'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
