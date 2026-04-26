'use client';

import { useEffect, useState } from 'react';

interface RatePlan {
  id: string;
  name: string;
  description: string | null;
  base_rate: number;
  tax_c_rate: number;
  tax_s_rate: number;
  is_active: boolean;
  created_at: string;
}

export default function RatePlansPage() {
  const [ratePlans, setRatePlans] = useState<RatePlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingPlan, setEditingPlan] = useState<RatePlan | null>(null);
  const [filter, setFilter] = useState<'active' | 'inactive' | 'all'>('active');
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    base_rate: 70,
    tax_c_rate: 7,
    tax_s_rate: 6,
  });

  useEffect(() => {
    fetchRatePlans();
  }, []);

  const fetchRatePlans = async () => {
    try {
      const res = await fetch('/api/rate-plans');
      if (res.ok) {
        const data = await res.json();
        setRatePlans(data);
      }
    } catch (error) {
      console.error('Error fetching rate plans:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        tax_c_rate: formData.tax_c_rate / 100,
        tax_s_rate: formData.tax_s_rate / 100,
      };

      if (editingPlan) {
        const res = await fetch(`/api/rate-plans/${editingPlan.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const err = await res.json();
          alert('Error: ' + (err.error || 'Failed to update'));
          return;
        }
        alert('Rate plan updated successfully!');
      } else {
        const res = await fetch('/api/rate-plans', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const err = await res.json();
          alert('Error: ' + (err.error || 'Failed to create'));
          return;
        }
        alert('Rate plan created successfully!');
      }
      setShowModal(false);
      setEditingPlan(null);
      resetForm();
      fetchRatePlans();
    } catch (error) {
      console.error('Error saving rate plan:', error);
    }
  };

  const handleEdit = (plan: RatePlan) => {
    setEditingPlan(plan);
    setFormData({
      name: plan.name,
      description: plan.description || '',
      base_rate: plan.base_rate,
      tax_c_rate: Math.round(plan.tax_c_rate * 100),
      tax_s_rate: Math.round(plan.tax_s_rate * 100),
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this rate plan? This will fail if it is assigned to any entries.')) return;
    try {
      const res = await fetch(`/api/rate-plans/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const err = await res.json();
        alert('Error: ' + (err.error || 'Failed to delete'));
        return;
      }
      fetchRatePlans();
    } catch (error) {
      console.error('Error deleting rate plan:', error);
    }
  };

  const handleToggleActive = async (plan: RatePlan) => {
    try {
      await fetch(`/api/rate-plans/${plan.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !plan.is_active }),
      });
      fetchRatePlans();
    } catch (error) {
      console.error('Error toggling rate plan:', error);
    }
  };

  const filteredPlans = ratePlans.filter(p => {
    if (filter === 'active') return p.is_active;
    if (filter === 'inactive') return !p.is_active;
    return true;
  });

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      base_rate: 70,
      tax_c_rate: 7,
      tax_s_rate: 6,
    });
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
          <h1 className="text-2xl font-bold text-white">Rate Plans</h1>
          <p className="text-slate-400">Manage pricing plans for rooms and RV sites</p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setEditingPlan(null);
            setShowModal(true);
          }}
          className="px-4 py-2 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 text-slate-900 font-semibold hover:from-amber-400 hover:to-amber-500 transition"
        >
          + Add Rate Plan
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2">
        {(['active', 'inactive', 'all'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition capitalize ${
              filter === f
                ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                : 'bg-slate-800 text-slate-400 border border-slate-700 hover:text-white'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Rate Plans Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredPlans.map((plan) => (
          <div key={plan.id} className="bg-slate-900 rounded-xl p-6 border border-slate-800">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-white">{plan.name}</h3>
                {plan.description && (
                  <p className="text-sm text-slate-400 mt-1">{plan.description}</p>
                )}
              </div>
              <button
                onClick={() => handleToggleActive(plan)}
                className={`px-3 py-1 rounded text-xs font-medium transition ${
                  plan.is_active
                    ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                    : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
                }`}
              >
                {plan.is_active ? 'Active' : 'Inactive'}
              </button>
            </div>

            <div className="space-y-2 mb-4">
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Base Rate</span>
                <span className="text-white font-medium">${plan.base_rate.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">City Tax</span>
                <span className="text-white">{(plan.tax_c_rate * 100).toFixed(1)}%</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">State Tax</span>
                <span className="text-white">{(plan.tax_s_rate * 100).toFixed(1)}%</span>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => handleEdit(plan)}
                className="flex-1 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition text-sm"
              >
                Edit
              </button>
              <button
                onClick={() => handleDelete(plan.id)}
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

      {filteredPlans.length === 0 && (
        <div className="text-center py-12 text-slate-500">
          No rate plans yet. Create your first rate plan to get started.
        </div>
      )}

      {/* Rate Plan Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 rounded-2xl w-full max-w-md border border-slate-700">
            <div className="px-6 py-4 border-b border-slate-700">
              <h3 className="text-xl font-bold text-white">
                {editingPlan ? 'Edit Rate Plan' : 'Add Rate Plan'}
              </h3>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Plan Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-3 rounded-lg bg-slate-800 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  placeholder="e.g., Standard Room"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Description
                </label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-3 rounded-lg bg-slate-800 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  placeholder="Optional description"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Base Rate ($) *
                </label>
                <input
                  type="number"
                  value={formData.base_rate}
                  onChange={(e) => setFormData({ ...formData, base_rate: parseFloat(e.target.value) || 0 })}
                  className="w-full px-4 py-3 rounded-lg bg-slate-800 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  placeholder="70.00"
                  step="0.01"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    City Tax (%) *
                  </label>
                  <input
                    type="number"
                    value={formData.tax_c_rate}
                    onChange={(e) => setFormData({ ...formData, tax_c_rate: parseFloat(e.target.value) || 0 })}
                    className="w-full px-4 py-3 rounded-lg bg-slate-800 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                    step="0.1"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    State Tax (%) *
                  </label>
                  <input
                    type="number"
                    value={formData.tax_s_rate}
                    onChange={(e) => setFormData({ ...formData, tax_s_rate: parseFloat(e.target.value) || 0 })}
                    className="w-full px-4 py-3 rounded-lg bg-slate-800 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                    step="0.1"
                    required
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditingPlan(null);
                  }}
                  className="flex-1 py-3 border border-slate-700 rounded-lg text-slate-300 hover:bg-slate-800 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 bg-gradient-to-r from-amber-500 to-amber-600 text-slate-900 rounded-lg font-semibold hover:from-amber-400 hover:to-amber-500 transition"
                >
                  {editingPlan ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}