'use client';

import { useState, useEffect, useRef } from 'react';

interface Settings {
  name: string;
  address: string;
  phone: string;
  city_tax_rate: number;
  state_tax_rate: number;
  default_room_rate: number;
  default_pet_fee: number;
  weekly_30amp: number;
  weekly_50amp: number;
  monthly_30amp: number;
  monthly_50amp: number;
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings>({
    name: 'American Inn and RV Park',
    address: '',
    phone: '',
    city_tax_rate: 7,
    state_tax_rate: 6,
    default_room_rate: 70,
    default_pet_fee: 20,
    weekly_30amp: 200,
    weekly_50amp: 230,
    monthly_30amp: 400,
    monthly_50amp: 500,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/settings');
      if (!res.ok) {
        console.error('Settings fetch error:', res.status);
        return;
      }
      const data = await res.json();
      if (!data) return;

      // Convert tax rates from decimal (0.07) to percentage (7)
      const cityTaxPercent = data.city_tax_rate != null ? Math.round(data.city_tax_rate * 100) : 7;
      const stateTaxPercent = data.state_tax_rate != null ? Math.round(data.state_tax_rate * 100) : 6;

      setSettings({
        name: data.name || 'American Inn and RV Park',
        address: data.address || '',
        phone: data.phone || '',
        city_tax_rate: cityTaxPercent,
        state_tax_rate: stateTaxPercent,
        default_room_rate: data.default_room_rate || 70,
        default_pet_fee: data.default_pet_fee || 20,
        weekly_30amp: data.weekly_30amp || 200,
        weekly_50amp: data.weekly_50amp || 230,
        monthly_30amp: data.monthly_30amp || 400,
        monthly_50amp: data.monthly_50amp || 500,
      });
      setLogoUrl(data.logo_url || '');
    } catch (error) {
      console.error('Error fetching settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: keyof Settings, value: string | number) => {
    setSettings(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Round tax rates to avoid floating point issues
      const cityTax = Math.round(settings.city_tax_rate);
      const stateTax = Math.round(settings.state_tax_rate);

      const payload: Record<string, unknown> = {
        name: settings.name,
        address: settings.address,
        phone: settings.phone,
        city_tax_rate: cityTax / 100,
        state_tax_rate: stateTax / 100,
        default_room_rate: settings.default_room_rate,
        default_pet_fee: settings.default_pet_fee,
        weekly_30amp: settings.weekly_30amp,
        weekly_50amp: settings.weekly_50amp,
        monthly_30amp: settings.monthly_30amp,
        monthly_50amp: settings.monthly_50amp,
      };

      // Only include logo_url if user uploaded a new one (don't clear existing)
      if (logoUrl) {
        payload.logo_url = logoUrl;
      }

      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        alert('Settings saved successfully!');
        fetchSettings();
      } else {
        const err = await res.text();
        alert('Error saving: ' + err);
      }
    } catch (error) {
      alert('Error: ' + String(error));
    } finally {
      setSaving(false);
    }
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      alert('File size must be under 2MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      setLogoUrl(base64);
    };
    reader.readAsDataURL(file);
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
              value={settings.name}
              onChange={(e) => handleChange('name', e.target.value)}
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
          <div className={`w-24 h-24 rounded-xl flex items-center justify-center overflow-hidden ${logoUrl ? 'bg-transparent' : 'bg-gradient-to-br from-amber-400 to-amber-600'}`}>
            {logoUrl ? (
              <img src={logoUrl} alt="Logo" className="w-full h-full object-contain" />
            ) : (
              <span className="text-2xl font-bold text-slate-900">AI</span>
            )}
          </div>
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleLogoUpload}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-4 py-2 rounded-lg bg-slate-800 text-white hover:bg-slate-700 transition"
            >
              {saving ? 'Uploading...' : 'Upload Logo'}
            </button>
            <p className="text-xs text-slate-500 mt-2">PNG, JPG up to 2MB</p>
            {logoUrl && (
              <button
                onClick={() => setLogoUrl('')}
                className="block mt-2 text-xs text-red-400 hover:text-red-300"
              >
                Remove logo
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Tax Rates */}
      <div className="bg-slate-900 rounded-xl p-6 border border-slate-800">
        <h3 className="text-lg font-semibold text-white mb-4">Tax Rates (%)</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">City Tax (%)</label>
            <input
              type="number"
              step="0.1"
              min="0"
              max="100"
              value={settings.city_tax_rate}
              onChange={(e) => handleChange('city_tax_rate', parseFloat(e.target.value) || 0)}
              className="w-full px-4 py-3 rounded-lg bg-slate-800 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">State Tax (%)</label>
            <input
              type="number"
              step="0.1"
              min="0"
              max="100"
              value={settings.state_tax_rate}
              onChange={(e) => handleChange('state_tax_rate', parseFloat(e.target.value) || 0)}
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
              value={settings.default_room_rate}
              onChange={(e) => handleChange('default_room_rate', parseFloat(e.target.value) || 0)}
              className="w-full px-4 py-3 rounded-lg bg-slate-800 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Default Pet Fee ($/night)</label>
            <input
              type="number"
              value={settings.default_pet_fee}
              onChange={(e) => handleChange('default_pet_fee', parseFloat(e.target.value) || 0)}
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
              value={settings.weekly_30amp}
              onChange={(e) => handleChange('weekly_30amp', parseFloat(e.target.value) || 0)}
              className="w-full px-4 py-3 rounded-lg bg-slate-800 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Weekly 50 AMP ($)</label>
            <input
              type="number"
              value={settings.weekly_50amp}
              onChange={(e) => handleChange('weekly_50amp', parseFloat(e.target.value) || 0)}
              className="w-full px-4 py-3 rounded-lg bg-slate-800 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Monthly 30 AMP ($)</label>
            <input
              type="number"
              value={settings.monthly_30amp}
              onChange={(e) => handleChange('monthly_30amp', parseFloat(e.target.value) || 0)}
              className="w-full px-4 py-3 rounded-lg bg-slate-800 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Monthly 50 AMP ($)</label>
            <input
              type="number"
              value={settings.monthly_50amp}
              onChange={(e) => handleChange('monthly_50amp', parseFloat(e.target.value) || 0)}
              className="w-full px-4 py-3 rounded-lg bg-slate-800 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-3 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 text-slate-900 font-semibold hover:from-amber-400 hover:to-amber-500 transition disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>
    </div>
  );
}
