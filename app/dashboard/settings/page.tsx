'use client';

import { useState } from 'react';

export default function SettingsPage() {
  const [settings, setSettings] = useState({
    propertyName: 'American Inn and RV Park',
    address: '',
    phone: '',
    cityTaxRate: 7,
    stateTaxRate: 6,
    defaultRoomRate: 70,
    defaultPetFee: 20,
    weekly30Amp: 200,
    weekly50Amp: 230,
    monthly30Amp: 400,
    monthly50Amp: 500,
  });

  const handleChange = (field: string, value: string | number) => {
    setSettings({ ...settings, [field]: value });
  };

  const handleSave = () => {
    alert('Settings saved successfully!');
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Settings</h1>
        <p className="text-slate-400">Configure your property settings</p>
      </div>

      {/* Property Information */}
      <div className="bg-slate-900 rounded-xl p-6 border border-slate-800">
        <h3 className="text-lg font-semibold text-white mb-4">Property Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Property Name</label>
            <input
              type="text"
              value={settings.propertyName}
              onChange={(e) => handleChange('propertyName', e.target.value)}
              className="w-full px-4 py-3 rounded-lg bg-slate-800 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Phone</label>
            <input
              type="text"
              value={settings.phone}
              onChange={(e) => handleChange('phone', e.target.value)}
              className="w-full px-4 py-3 rounded-lg bg-slate-800 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
              placeholder="(555) 123-4567"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-slate-300 mb-2">Address</label>
            <input
              type="text"
              value={settings.address}
              onChange={(e) => handleChange('address', e.target.value)}
              className="w-full px-4 py-3 rounded-lg bg-slate-800 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
              placeholder="123 Main Street, City, State 12345"
            />
          </div>
        </div>
      </div>

      {/* Logo Upload */}
      <div className="bg-slate-900 rounded-xl p-6 border border-slate-800">
        <h3 className="text-lg font-semibold text-white mb-4">Logo</h3>
        <div className="flex items-center gap-6">
          <div className="w-24 h-24 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center">
            <span className="text-2xl font-bold text-slate-900">AI</span>
          </div>
          <div>
            <button className="px-4 py-2 rounded-lg bg-slate-800 text-white hover:bg-slate-700 transition">
              Upload Logo
            </button>
            <p className="text-xs text-slate-500 mt-2">PNG, JPG up to 2MB</p>
          </div>
        </div>
      </div>

      {/* Tax Rates */}
      <div className="bg-slate-900 rounded-xl p-6 border border-slate-800">
        <h3 className="text-lg font-semibold text-white mb-4">Tax Rates</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">City Tax (%)</label>
            <input
              type="number"
              value={settings.cityTaxRate}
              onChange={(e) => handleChange('cityTaxRate', parseFloat(e.target.value) || 0)}
              className="w-full px-4 py-3 rounded-lg bg-slate-800 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">State Tax (%)</label>
            <input
              type="number"
              value={settings.stateTaxRate}
              onChange={(e) => handleChange('stateTaxRate', parseFloat(e.target.value) || 0)}
              className="w-full px-4 py-3 rounded-lg bg-slate-800 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>
        </div>
      </div>

      {/* Default Rates */}
      <div className="bg-slate-900 rounded-xl p-6 border border-slate-800">
        <h3 className="text-lg font-semibold text-white mb-4">Default Rates</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Standard Room Rate ($)</label>
            <input
              type="number"
              value={settings.defaultRoomRate}
              onChange={(e) => handleChange('defaultRoomRate', parseFloat(e.target.value) || 0)}
              className="w-full px-4 py-3 rounded-lg bg-slate-800 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Default Pet Fee ($/night)</label>
            <input
              type="number"
              value={settings.defaultPetFee}
              onChange={(e) => handleChange('defaultPetFee', parseFloat(e.target.value) || 0)}
              className="w-full px-4 py-3 rounded-lg bg-slate-800 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>
        </div>
      </div>

      {/* RV Rates */}
      <div className="bg-slate-900 rounded-xl p-6 border border-slate-800">
        <h3 className="text-lg font-semibold text-white mb-4">RV Rates</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Weekly 30 AMP ($)</label>
            <input
              type="number"
              value={settings.weekly30Amp}
              onChange={(e) => handleChange('weekly30Amp', parseFloat(e.target.value) || 0)}
              className="w-full px-4 py-3 rounded-lg bg-slate-800 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Weekly 50 AMP ($)</label>
            <input
              type="number"
              value={settings.weekly50Amp}
              onChange={(e) => handleChange('weekly50Amp', parseFloat(e.target.value) || 0)}
              className="w-full px-4 py-3 rounded-lg bg-slate-800 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Monthly 30 AMP ($)</label>
            <input
              type="number"
              value={settings.monthly30Amp}
              onChange={(e) => handleChange('monthly30Amp', parseFloat(e.target.value) || 0)}
              className="w-full px-4 py-3 rounded-lg bg-slate-800 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Monthly 50 AMP ($)</label>
            <input
              type="number"
              value={settings.monthly50Amp}
              onChange={(e) => handleChange('monthly50Amp', parseFloat(e.target.value) || 0)}
              className="w-full px-4 py-3 rounded-lg bg-slate-800 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          className="px-6 py-3 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 text-slate-900 font-semibold hover:from-amber-400 hover:to-amber-500 transition"
        >
          Save Settings
        </button>
      </div>
    </div>
  );
}
