'use client';

import { useEffect, useState } from 'react';

interface Role {
  id: string;
  name: string;
  permissions: string[];
  is_active: boolean;
  created_at: string;
}

const MODULES = [
  { key: 'dashboard', label: 'Dashboard', description: 'View dashboard' },
  { key: 'entries', label: 'Daily Entry', description: 'View and manage entries' },
  { key: 'housekeeping', label: 'Housekeeping', description: 'View and manage housekeeping' },
  { key: 'reports', label: 'Reports', description: 'View and export reports' },
  { key: 'settings', label: 'Settings', description: 'View and edit settings' },
  { key: 'users', label: 'User Management', description: 'Manage users' },
  { key: 'roles', label: 'Roles', description: 'Manage roles' },
  { key: 'rate_plans', label: 'Rate Plans', description: 'Manage rate plans' },
  { key: 'audit_log', label: 'Audit Log', description: 'View audit logs' },
  { key: 'reset', label: 'Reset Data', description: 'Yearly and factory reset' },
];

const PERMISSION_ACTIONS = [
  { key: 'view', label: 'View' },
  { key: 'add', label: 'Add' },
  { key: 'edit', label: 'Edit' },
  { key: 'delete', label: 'Delete' },
];

export default function RolesPage() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    permissions: [] as string[],
  });

  useEffect(() => {
    fetchRoles();
  }, []);

  const fetchRoles = async () => {
    try {
      const res = await fetch('/api/roles');
      if (res.ok) {
        const data = await res.json();
        setRoles(data);
      }
    } catch (error) {
      console.error('Error fetching roles:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingRole) {
        const res = await fetch(`/api/roles/${editingRole.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        });
        if (!res.ok) {
          const err = await res.json();
          alert('Error: ' + (err.error || 'Failed to update'));
          return;
        }
        alert('Role updated successfully!');
      } else {
        const res = await fetch('/api/roles', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        });
        if (!res.ok) {
          const err = await res.json();
          alert('Error: ' + (err.error || 'Failed to create'));
          return;
        }
        alert('Role created successfully!');
      }
      setShowModal(false);
      setEditingRole(null);
      resetForm();
      fetchRoles();
    } catch (error) {
      console.error('Error saving role:', error);
    }
  };

  const handleEdit = (role: Role) => {
    setEditingRole(role);
    setFormData({
      name: role.name,
      permissions: role.permissions || [],
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this role?')) return;
    try {
      const res = await fetch(`/api/roles/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const err = await res.json();
        alert('Error: ' + (err.error || 'Failed to delete'));
        return;
      }
      fetchRoles();
    } catch (error) {
      console.error('Error deleting role:', error);
    }
  };

  const handleToggleActive = async (role: Role) => {
    try {
      await fetch(`/api/roles/${role.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !role.is_active }),
      });
      fetchRoles();
    } catch (error) {
      console.error('Error toggling role:', error);
    }
  };

  const resetForm = () => {
    setFormData({ name: '', permissions: [] });
  };

  const togglePermission = (permission: string) => {
    setFormData(prev => ({
      ...prev,
      permissions: prev.permissions.includes(permission)
        ? prev.permissions.filter(p => p !== permission)
        : [...prev.permissions, permission],
    }));
  };

  const getPermissionBadge = (role: Role) => {
    const perms = role.permissions || [];
    if (perms.includes('all')) return 'bg-amber-500/20 text-amber-400';
    if (perms.length === 0) return 'bg-slate-700 text-slate-400';
    return 'bg-green-500/20 text-green-400';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-slate-400">Loading...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Roles</h1>
          <p className="text-slate-400">Manage user roles and permissions</p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setEditingRole(null);
            setShowModal(true);
          }}
          className="px-4 py-2 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 text-slate-900 font-semibold hover:from-amber-400 hover:to-amber-500 transition"
        >
          + Add Role
        </button>
      </div>

      {/* Roles Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {roles.map((role) => (
          <div key={role.id} className="bg-slate-900 rounded-xl p-6 border border-slate-800">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-white">{role.name}</h3>
                <span className={`inline-block mt-1 px-2 py-1 rounded text-xs font-medium ${getPermissionBadge(role)}`}>
                  {role.permissions?.includes('all') ? 'All Permissions' : `${role.permissions?.length || 0} permissions`}
                </span>
              </div>
              <button
                onClick={() => handleToggleActive(role)}
                className={`px-3 py-1 rounded text-xs font-medium transition ${
                  role.is_active
                    ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                    : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
                }`}
              >
                {role.is_active ? 'Active' : 'Inactive'}
              </button>
            </div>

            <div className="space-y-1 mb-4">
              <p className="text-xs text-slate-500 uppercase tracking-wider">Permissions</p>
              <div className="flex flex-wrap gap-1">
                {role.permissions?.includes('all') ? (
                  <span className="text-xs text-slate-400">Full access</span>
                ) : role.permissions?.length > 0 ? (
                  role.permissions.map(p => (
                    <span key={p} className="px-2 py-0.5 bg-slate-800 rounded text-xs text-slate-300">
                      {p}
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-slate-500">No permissions</span>
                )}
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => handleEdit(role)}
                className="flex-1 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition text-sm"
              >
                Edit
              </button>
              <button
                onClick={() => handleDelete(role.id)}
                className="py-2 px-3 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition text-sm"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          </div>
        ))}
      </div>

      {roles.length === 0 && (
        <div className="text-center py-12 text-slate-500">
          No roles yet. Create your first role to get started.
        </div>
      )}

      {/* Role Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto border border-slate-700">
            <div className="px-6 py-4 border-b border-slate-700">
              <h3 className="text-xl font-bold text-white">
                {editingRole ? 'Edit Role' : 'Add Role'}
              </h3>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Role Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-3 rounded-lg bg-slate-800 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  placeholder="e.g., Front Desk Agent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Permissions
                </label>
                <p className="text-xs text-slate-500 mb-3">
                  Select "All" for full access, or grant specific permissions below
                </p>

                {/* All Permission Toggle */}
                <div className="mb-4 p-3 bg-slate-800 rounded-lg border border-slate-700">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.permissions.includes('all')}
                      onChange={() => togglePermission('all')}
                      className="w-5 h-5 rounded border-slate-600 bg-slate-700 text-amber-500 focus:ring-amber-500"
                    />
                    <div>
                      <span className="text-white font-medium">All Permissions</span>
                      <p className="text-xs text-slate-400">Full access to all modules</p>
                    </div>
                  </label>
                </div>

                {/* Module Permissions */}
                <div className="space-y-3">
                  {MODULES.map((module) => (
                    <div key={module.key} className="p-3 bg-slate-800 rounded-lg border border-slate-700">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <span className="text-white font-medium">{module.label}</span>
                          <p className="text-xs text-slate-400">{module.description}</p>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {PERMISSION_ACTIONS.map((action) => (
                          <label key={action.key} className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={formData.permissions.includes(`${module.key}:${action.key}`)}
                              onChange={() => togglePermission(`${module.key}:${action.key}`)}
                              disabled={formData.permissions.includes('all')}
                              className="w-4 h-4 rounded border-slate-600 bg-slate-700 text-amber-500 focus:ring-amber-500"
                            />
                            <span className="text-sm text-slate-300">{action.label}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditingRole(null);
                  }}
                  className="flex-1 py-3 border border-slate-700 rounded-lg text-slate-300 hover:bg-slate-800 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 bg-gradient-to-r from-amber-500 to-amber-600 text-slate-900 rounded-lg font-semibold hover:from-amber-400 hover:to-amber-500 transition"
                >
                  {editingRole ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}