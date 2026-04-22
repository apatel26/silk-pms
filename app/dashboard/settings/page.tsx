'use client';

import { useState, useEffect, useRef } from 'react';

interface Settings {
  name: string;
  address: string;
  phone: string;
  city_tax_rate: number;
  state_tax_rate: number;
  default_pet_fee: number;
  weekly_30amp: number;
  weekly_50amp: number;
  monthly_30amp: number;
  monthly_50amp: number;
}

interface UserProfilePhotoSectionProps {
  userId?: string;
  currentPhoto?: string | null;
  username?: string;
}

function UserProfilePhotoSection({ userId, currentPhoto, username }: UserProfilePhotoSectionProps) {
  const [photoUrl, setPhotoUrl] = useState<string | null>(currentPhoto || null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Fetch current user photo on mount
    fetchUserPhoto();
  }, []);

  const fetchUserPhoto = async () => {
    try {
      const res = await fetch('/api/auth');
      if (res.ok) {
        const data = await res.json();
        if (data.user?.photoUrl) {
          setPhotoUrl(data.user.photoUrl);
        }
      }
    } catch (error) {
      console.error('Error fetching user photo:', error);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
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

    setUploading(true);
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = reader.result as string;
        const res = await fetch('/api/user-photo', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ photo_url: base64 }),
        });
        if (res.ok) {
          const data = await res.json();
          setPhotoUrl(data.photo_url);
          alert('Profile photo updated successfully!');
        } else {
          alert('Failed to update photo');
        }
      };
      reader.readAsDataURL(file);
    } catch (error) {
      alert('Error uploading photo: ' + String(error));
    } finally {
      setUploading(false);
    }
  };

  const handleRemovePhoto = async () => {
    if (!confirm('Remove your profile photo?')) return;
    try {
      const res = await fetch('/api/user-photo', { method: 'DELETE' });
      if (res.ok) {
        setPhotoUrl(null);
        alert('Profile photo removed');
      }
    } catch (error) {
      alert('Error removing photo: ' + String(error));
    }
  };

  return (
    <div className="bg-slate-900 rounded-xl p-6 border border-slate-800">
      <h3 className="text-lg font-semibold text-white mb-4">Your Profile Photo</h3>
      <div className="flex items-center gap-6">
        <div className="w-20 h-20 rounded-full overflow-hidden bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center">
          {photoUrl ? (
            <img src={photoUrl} alt="Profile" className="w-full h-full object-cover" />
          ) : (
            <span className="text-2xl font-bold text-slate-900">{username?.charAt(0).toUpperCase() || 'U'}</span>
          )}
        </div>
        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handlePhotoUpload}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="px-4 py-2 rounded-lg bg-slate-800 text-white hover:bg-slate-700 transition disabled:opacity-50"
          >
            {uploading ? 'Uploading...' : 'Upload Photo'}
          </button>
          {photoUrl && (
            <button
              onClick={handleRemovePhoto}
              className="block mt-2 text-sm text-red-400 hover:text-red-300"
            >
              Remove photo
            </button>
          )}
          <p className="text-xs text-slate-500 mt-2">PNG, JPG up to 2MB</p>
        </div>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings>({
    name: 'American Inn and RV Park',
    address: '',
    phone: '',
    city_tax_rate: 7,
    state_tax_rate: 6,
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

      {/* Factory Reset */}
      <div className="bg-slate-900 rounded-xl p-6 border border-slate-800">
        <h3 className="text-lg font-semibold text-white mb-4">Factory Reset</h3>
        <p className="text-sm text-slate-400 mb-4">
          Factory reset will delete all entries, housekeeping tasks, audit logs, and customer data. This action cannot be undone. Users, rooms, and settings will be preserved.
        </p>
        <button
          onClick={async () => {
            if (!confirm('Are you sure you want to factory reset? This will delete ALL operational data (entries, housekeeping, audit logs, customers). This cannot be undone!')) return;
            if (!confirm('FINAL WARNING: This will permanently delete all entries and related data. Type "RESET" to confirm.')) return;
            try {
              const res = await fetch('/api/reset', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ type: 'factory' }),
              });
              if (res.ok) {
                alert('Factory reset completed successfully. All operational data has been cleared.');
              } else {
                const err = await res.json();
                alert('Error: ' + (err.error || 'Failed to reset'));
              }
            } catch (error) {
              alert('Error during factory reset: ' + String(error));
            }
          }}
          className="px-4 py-2 rounded-lg bg-red-500/20 text-red-400 border border-red-500/20 hover:bg-red-500/30 transition"
        >
          Factory Reset
        </button>
      </div>

      {/* User Profile Photo */}
      <UserProfilePhotoSection />

      {/* Cloud Backup */}
      <div className="bg-slate-900 rounded-xl p-6 border border-slate-800">
        <h3 className="text-lg font-semibold text-white mb-4">Cloud Backup</h3>
        <p className="text-sm text-slate-400 mb-4">
          Backup your data to cloud storage for safekeeping. Supported services: Google Drive, OneDrive.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <button
            onClick={async () => {
              alert('Google Drive integration coming soon! For now, use the export backup feature in Reports.');
            }}
            className="flex items-center justify-center gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 transition"
          >
            <svg className="w-8 h-8 text-red-500" viewBox="0 0 24 24" fill="currentColor">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            <div className="text-left">
              <p className="font-semibold text-white">Google Drive</p>
              <p className="text-xs text-slate-400">Coming soon</p>
            </div>
          </button>
          <button
            onClick={async () => {
              alert('OneDrive integration coming soon! For now, use the export backup feature in Reports.');
            }}
            className="flex items-center justify-center gap-3 p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 hover:bg-blue-500/20 transition"
          >
            <svg className="w-8 h-8 text-blue-500" viewBox="0 0 24 24" fill="currentColor">
              <path d="M11.5 2.5L2 8.5l9.5 6 9.5-6-9.5-6zM2 14.5l9.5 6 9.5-6M2 11.5l9.5 6m0-12l9.5 6m-9.5 6l9.5 6" stroke="currentColor" strokeWidth="1.5" fill="none"/>
            </svg>
            <div className="text-left">
              <p className="font-semibold text-white">OneDrive</p>
              <p className="text-xs text-slate-400">Coming soon</p>
            </div>
          </button>
        </div>
        <p className="text-xs text-slate-500 mt-4">
          For now, use the manual export in Reports to download Excel backups which you can then upload to your preferred cloud service.
        </p>
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
