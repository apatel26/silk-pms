'use client';

import { useEffect, useState } from 'react';
import dayjs from 'dayjs';

interface AuditLog {
  id: string;
  user_id: string;
  username: string;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  details: string | null;
  ip_address: string | null;
  created_at: string;
}

const ACTION_TYPES = [
  { value: '', label: 'All Actions' },
  { value: 'login', label: 'Login' },
  { value: 'logout', label: 'Logout' },
  { value: 'create', label: 'Create' },
  { value: 'update', label: 'Update' },
  { value: 'delete', label: 'Delete' },
  { value: 'reset', label: 'Reset' },
  { value: 'export', label: 'Export' },
];

const ENTITY_TYPES = [
  { value: '', label: 'All Entities' },
  { value: 'user', label: 'User' },
  { value: 'entry', label: 'Entry' },
  { value: 'settings', label: 'Settings' },
  { value: 'role', label: 'Role' },
  { value: 'rate_plan', label: 'Rate Plan' },
  { value: 'housekeeping', label: 'Housekeeping' },
];

export default function AuditLogPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [filters, setFilters] = useState({
    action: '',
    entity_type: '',
    start_date: '',
    end_date: '',
  });
  const limit = 50;

  useEffect(() => {
    fetchLogs();
  }, [page, filters]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        limit: String(limit),
        offset: String(page * limit),
      });
      if (filters.action) params.append('action', filters.action);
      if (filters.entity_type) params.append('entity_type', filters.entity_type);
      if (filters.start_date) params.append('start_date', filters.start_date);
      if (filters.end_date) params.append('end_date', filters.end_date);

      const res = await fetch(`/api/audit?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs || []);
        setTotal(data.total || 0);
      }
    } catch (error) {
      console.error('Error fetching audit logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPage(0);
  };

  const getActionBadgeColor = (action: string) => {
    switch (action) {
      case 'login': return 'bg-green-500/20 text-green-400';
      case 'logout': return 'bg-slate-500/20 text-slate-400';
      case 'create': return 'bg-blue-500/20 text-blue-400';
      case 'update': return 'bg-amber-500/20 text-amber-400';
      case 'delete': return 'bg-red-500/20 text-red-400';
      case 'reset': return 'bg-purple-500/20 text-purple-400';
      case 'export': return 'bg-cyan-500/20 text-cyan-400';
      default: return 'bg-slate-500/20 text-slate-400';
    }
  };

  const formatDetails = (details: string | null) => {
    if (!details) return '';
    try {
      const parsed = JSON.parse(details);
      return Object.entries(parsed)
        .map(([key, value]) => `${key}: ${value}`)
        .join(', ');
    } catch {
      return details;
    }
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-6">
      {/* Header & Filters */}
      <div className="space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">Audit Log</h1>
            <p className="text-slate-400">Track all user actions in the system</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-slate-400">{total} entries</span>
            <button
              onClick={fetchLogs}
              className="px-4 py-2 rounded-lg bg-blue-600/10 text-blue-400 border border-blue-600/20 hover:bg-blue-600/20 transition"
            >
              Refresh
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-slate-900 rounded-xl p-4 border border-slate-800">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Action</label>
              <select
                value={filters.action}
                onChange={(e) => handleFilterChange('action', e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                {ACTION_TYPES.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Entity Type</label>
              <select
                value={filters.entity_type}
                onChange={(e) => handleFilterChange('entity_type', e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                {ENTITY_TYPES.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">From Date</label>
              <input
                type="date"
                value={filters.start_date}
                onChange={(e) => handleFilterChange('start_date', e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">To Date</label>
              <input
                type="date"
                value={filters.end_date}
                onChange={(e) => handleFilterChange('end_date', e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-400">Loading...</div>
        ) : logs.length === 0 ? (
          <div className="p-8 text-center text-slate-500">No audit logs found</div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-800 border-b border-slate-700">
                  <tr>
                    <th className="text-left px-4 py-3 text-sm font-semibold text-slate-300">Timestamp</th>
                    <th className="text-left px-4 py-3 text-sm font-semibold text-slate-300">User</th>
                    <th className="text-left px-4 py-3 text-sm font-semibold text-slate-300">Action</th>
                    <th className="text-left px-4 py-3 text-sm font-semibold text-slate-300">Entity</th>
                    <th className="text-left px-4 py-3 text-sm font-semibold text-slate-300">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {logs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-800/50">
                      <td className="px-4 py-3 text-sm text-slate-400">
                        {dayjs(log.created_at).format('MM/DD/YYYY HH:mm:ss')}
                      </td>
                      <td className="px-4 py-3 text-sm text-white">
                        {log.username || 'System'}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${getActionBadgeColor(log.action)}`}>
                          {log.action}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-400">
                        {log.entity_type || '-'}
                        {log.entity_id && <span className="text-xs text-slate-500 ml-1">#{log.entity_id.substring(0, 8)}</span>}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-400 max-w-xs truncate">
                        {formatDetails(log.details)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="px-4 py-3 border-t border-slate-800 flex items-center justify-between">
                <button
                  onClick={() => setPage(p => Math.max(0, p - 1))}
                  disabled={page === 0}
                  className="px-3 py-1 rounded bg-slate-800 text-slate-300 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <span className="text-sm text-slate-400">
                  Page {page + 1} of {totalPages}
                </span>
                <button
                  onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                  disabled={page >= totalPages - 1}
                  className="px-3 py-1 rounded bg-slate-800 text-slate-300 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}