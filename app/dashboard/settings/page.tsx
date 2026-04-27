'use client';

import { useState, useEffect, useRef } from 'react';
import { useTheme, type ThemeName, type UIStyle } from '@/lib/context/ThemeContext';
import { THEMES } from '@/lib/types';

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
  ui_theme?: ThemeName;
  ui_style?: UIStyle;
}

// Theme selector component
function ThemeSelector() {
  const { theme, uiStyle, setTheme, setUIStyle, isSilkUI } = useTheme();
  const [selectedTheme, setSelectedTheme] = useState<ThemeName>(theme);
  const [selectedStyle, setSelectedStyle] = useState<UIStyle>(uiStyle);

  useEffect(() => {
    setSelectedTheme(theme);
    setSelectedStyle(uiStyle);
  }, [theme, uiStyle]);

  const handleThemeChange = (newTheme: ThemeName) => {
    setSelectedTheme(newTheme);
    setTheme(newTheme);
  };

  const handleStyleChange = (newStyle: UIStyle) => {
    setSelectedStyle(newStyle);
    setUIStyle(newStyle);
  };

  return (
    <div className="glass-card p-6">
      <h3 className="text-lg font-semibold mb-4" style={{ color: 'hsl(var(--text-primary))' }}>Appearance</h3>

      {/* UI Style Toggle */}
      <div className="mb-6">
        <label className="block text-sm font-medium mb-3" style={{ color: 'hsl(var(--text-secondary))' }}>Interface Style</label>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => handleStyleChange('legacy')}
            className={`p-4 rounded-xl border transition-all ${
              selectedStyle === 'legacy'
                ? 'border-primary bg-primary/10'
                : 'border-border hover:border-border-light'
            }`}
          >
            <div className="text-left">
              <p className="font-medium" style={{ color: 'hsl(var(--text-primary))' }}>Classic</p>
              <p className="text-xs mt-1" style={{ color: 'hsl(var(--text-secondary))' }}>Standard dark theme</p>
            </div>
          </button>
          <button
            onClick={() => handleStyleChange('silk')}
            className={`p-4 rounded-xl border transition-all ${
              selectedStyle === 'silk'
                ? 'border-primary bg-primary/10'
                : 'border-border hover:border-border-light'
            }`}
          >
            <div className="text-left">
              <p className="font-medium" style={{ color: 'hsl(var(--text-primary))' }}>Silk UI</p>
              <p className="text-xs mt-1" style={{ color: 'hsl(var(--text-secondary))' }}>Apple Liquid Glass</p>
            </div>
          </button>
        </div>
      </div>

      {/* Theme Selection */}
      <div>
        <label className="block text-sm font-medium mb-3" style={{ color: 'hsl(var(--text-secondary))' }}>Color Theme</label>
        <div className="grid grid-cols-3 gap-3">
          {(Object.keys(THEMES) as ThemeName[]).map((themeKey) => {
            const themeConfig = THEMES[themeKey];
            const isSelected = selectedTheme === themeKey;
            return (
              <button
                key={themeKey}
                onClick={() => handleThemeChange(themeKey)}
                className={`relative p-3 rounded-xl border transition-all ${
                  isSelected ? 'border-primary scale-105' : 'border-border hover:border-border-light'
                }`}
              >
                <div
                  className="w-full h-10 rounded-lg mb-2"
                  style={{
                    background: `linear-gradient(135deg, hsl(${themeConfig.background.split(' ')[0]} ${themeConfig.background.split(' ')[1]} ${themeConfig.background.split(' ')[2]}),
                      hsl(${themeConfig.surface.split(' ')[0]} ${themeConfig.surface.split(' ')[1]} ${themeConfig.surface.split(' ')[2]}))`,
                  }}
                />
                <p className="text-xs font-medium text-center" style={{ color: 'hsl(var(--text-primary))' }}>
                  {themeConfig.label}
                </p>
                {isSelected && (
                  <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                    <svg className="w-3 h-3 text-slate-900" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
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
    <div className="glass-card p-6">
      <h3 className="text-lg font-semibold mb-4" style={{ color: 'hsl(var(--text-primary))' }}>Your Profile Photo</h3>
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
            className="px-4 py-2 rounded-lg background: bg-surface/80 backdrop-blur-xl border border-border text-text-secondary hover:text-text-primary hover:bg-surface transition disabled:opacity-50"
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
          <p style={{ color: 'hsl(var(--text-secondary))' }}>PNG, JPG up to 2MB</p>
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
    fetchBackups();
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
        ui_theme: data.ui_theme || 'dark',
        ui_style: data.ui_style || 'legacy',
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

  const fetchBackups = async () => {
    try {
      const res = await fetch('/api/cloud-backup');
      if (res.ok) {
        const data = await res.json();
        const list = document.getElementById('backupList');
        if (list) {
          if (!data || data.length === 0) {
            list.innerHTML = '<p class="text-xs text-slate-500">No backups yet</p>';
          } else {
            list.innerHTML = data.map((b: any) => `
              <div class="flex items-center justify-between p-3 bg-slate-800 rounded-lg">
                <div>
                  <p class="text-sm text-white font-medium">${b.year} Backup</p>
                  <p class="text-xs text-slate-400">${new Date(b.created_at).toLocaleDateString()} - ${b.entry_count} entries</p>
                </div>
                <div class="flex gap-2">
                  <a href="${b.file_path}" target="_blank" class="px-3 py-1 text-xs bg-blue-500/20 text-blue-400 rounded hover:bg-blue-500/30">Download</a>
                  <button onclick="deleteBackup('${b.id}', '${b.year}')" class="px-3 py-1 text-xs bg-red-500/20 text-red-400 rounded hover:bg-red-500/30">Delete</button>
                </div>
              </div>
            `).join('');
          }
        }
      }
    } catch (error) {
      console.error('Error fetching backups:', error);
    }
  };

  (window as any).deleteBackup = async (id: string, year: string) => {
    if (!confirm(`Delete ${year} backup?`)) return;
    try {
      const res = await fetch('/api/cloud-backup', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, year: parseInt(year) }),
      });
      if (res.ok) {
        fetchBackups();
        alert('Backup deleted');
      } else {
        alert('Failed to delete backup');
      }
    } catch (error) {
      alert('Error: ' + String(error));
    }
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
        <h1 className="text-2xl font-bold" style={{ color: 'hsl(var(--text-primary))' }}>Settings</h1>
        <p style={{ color: 'hsl(var(--text-secondary))' }}>Configure your property settings</p>
      </div>

      {/* Theme Selector */}
      <ThemeSelector />

      {/* Property Information */}
      <div className="glass-card p-6">
        <h3 className="text-lg font-semibold mb-4" style={{ color: 'hsl(var(--text-primary))' }}>Property Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Property Name</label>
            <input
              type="text"
              value={settings.name}
              onChange={(e) => handleChange('name', e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-surface/50 border border-border-light text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Phone</label>
            <input
              type="text"
              value={settings.phone}
              onChange={(e) => handleChange('phone', e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-surface/50 border border-border-light text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-primary/50"
              placeholder="(555) 123-4567"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-slate-300 mb-2">Address</label>
            <input
              type="text"
              value={settings.address}
              onChange={(e) => handleChange('address', e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-surface/50 border border-border-light text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-primary/50"
              placeholder="123 Main Street, City, State 12345"
            />
          </div>
        </div>
      </div>

      {/* Logo Upload */}
      <div className="glass-card p-6">
        <h3 className="text-lg font-semibold mb-4" style={{ color: 'hsl(var(--text-primary))' }}>Logo</h3>
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
              className="px-4 py-2 rounded-lg background: bg-surface/80 backdrop-blur-xl border border-border text-text-secondary hover:text-text-primary hover:bg-surface transition"
            >
              {saving ? 'Uploading...' : 'Upload Logo'}
            </button>
            <p style={{ color: 'hsl(var(--text-secondary))' }}>PNG, JPG up to 2MB</p>
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
      <div className="glass-card p-6">
        <h3 className="text-lg font-semibold mb-4" style={{ color: 'hsl(var(--text-primary))' }}>Tax Rates (%)</h3>
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
              className="w-full px-4 py-3 rounded-xl bg-surface/50 border border-border-light text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-primary/50"
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
              className="w-full px-4 py-3 rounded-xl bg-surface/50 border border-border-light text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
        </div>
      </div>

      {/* RV Rates */}
      <div className="glass-card p-6">
        <h3 className="text-lg font-semibold mb-4" style={{ color: 'hsl(var(--text-primary))' }}>RV Rates</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Weekly 30 AMP ($)</label>
            <input
              type="number"
              value={settings.weekly_30amp}
              onChange={(e) => handleChange('weekly_30amp', parseFloat(e.target.value) || 0)}
              className="w-full px-4 py-3 rounded-xl bg-surface/50 border border-border-light text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Weekly 50 AMP ($)</label>
            <input
              type="number"
              value={settings.weekly_50amp}
              onChange={(e) => handleChange('weekly_50amp', parseFloat(e.target.value) || 0)}
              className="w-full px-4 py-3 rounded-xl bg-surface/50 border border-border-light text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Monthly 30 AMP ($)</label>
            <input
              type="number"
              value={settings.monthly_30amp}
              onChange={(e) => handleChange('monthly_30amp', parseFloat(e.target.value) || 0)}
              className="w-full px-4 py-3 rounded-xl bg-surface/50 border border-border-light text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Monthly 50 AMP ($)</label>
            <input
              type="number"
              value={settings.monthly_50amp}
              onChange={(e) => handleChange('monthly_50amp', parseFloat(e.target.value) || 0)}
              className="w-full px-4 py-3 rounded-xl bg-surface/50 border border-border-light text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
        </div>
      </div>

      {/* Factory Reset */}
      <div className="glass-card p-6">
        <h3 className="text-lg font-semibold mb-4" style={{ color: 'hsl(var(--text-primary))' }}>Factory Reset</h3>
        <p className="text-sm mb-4" style={{ color: 'hsl(var(--text-secondary))' }}>
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
      <div className="glass-card p-6">
        <h3 className="text-lg font-semibold mb-4" style={{ color: 'hsl(var(--text-primary))' }}>Cloud Backup</h3>
        <p className="text-sm mb-4" style={{ color: 'hsl(var(--text-secondary))' }}>
          Backup your data to a separate Supabase database for safekeeping.
        </p>

        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <select
              id="backupYear"
              className="px-4 py-3 rounded-lg bg-slate-800 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              {(() => {
                const currentYear = new Date().getFullYear();
                return [currentYear, currentYear - 1, currentYear - 2].map(y => (
                  <option key={y} value={y}>{y}</option>
                ));
              })()}
            </select>
            <button
              onClick={async () => {
                const year = (document.getElementById('backupYear') as HTMLSelectElement).value;
                if (!confirm(`Create backup for ${year}?`)) return;
                const btn = event?.target as HTMLButtonElement;
                btn.disabled = true;
                btn.textContent = 'Creating backup...';
                try {
                  const res = await fetch('/api/cloud-backup', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ year: parseInt(year) }),
                  });
                  const data = await res.json();
                  if (res.ok) {
                    alert(`Backup created for ${year}! Entries backed up: ${data.entryCount}`);
                  } else {
                    alert('Error: ' + (data.error || 'Failed to create backup'));
                  }
                } catch (error) {
                  alert('Error: ' + String(error));
                } finally {
                  btn.disabled = false;
                  btn.textContent = 'Create Backup';
                }
              }}
              className="px-6 py-3 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 text-slate-900 font-semibold hover:from-amber-400 hover:to-amber-500 transition"
            >
              Create Backup
            </button>
          </div>

          <div id="backupList" className="space-y-2">
            <p className="text-xs text-slate-500">Loading backups...</p>
          </div>

          <div className="border-t border-slate-700 pt-4">
            <h4 className="text-sm font-medium text-slate-300 mb-3">Restore from Backup</h4>
            <p className="text-xs text-slate-500 mb-3">Upload a backup Excel file to restore entries. This will add entries without deleting existing data.</p>
            <div className="flex items-center gap-3">
              <input
                type="file"
                id="restoreFile"
                accept=".xlsx"
                className="hidden"
              />
              <button
                onClick={() => document.getElementById('restoreFile')?.click()}
                className="px-4 py-2 rounded-lg background: bg-surface/80 backdrop-blur-xl border border-border text-text-secondary hover:text-text-primary hover:bg-surface transition text-sm"
              >
                Select Backup File
              </button>
              <button
                onClick={async () => {
                  const fileInput = document.getElementById('restoreFile') as HTMLInputElement;
                  const file = fileInput?.files?.[0];
                  if (!file) {
                    alert('Please select a backup file first');
                    return;
                  }
                  if (!confirm(`Restore entries from ${file.name}? This will add entries to your database.`)) return;
                  const btn = event?.target as HTMLButtonElement;
                  btn.disabled = true;
                  btn.textContent = 'Restoring...';
                  try {
                    const formData = new FormData();
                    formData.append('file', file);
                    const res = await fetch('/api/cloud-backup/restore', {
                      method: 'POST',
                      body: formData,
                    });
                    const data = await res.json();
                    if (res.ok) {
                      alert(`Restored ${data.totalRestored} entries (${data.guestRooms} guest rooms, ${data.rvSites} RV sites)`);
                      fileInput.value = '';
                    } else {
                      alert('Error: ' + (data.error || 'Failed to restore backup'));
                    }
                  } catch (error) {
                    alert('Error: ' + String(error));
                  } finally {
                    btn.disabled = false;
                    btn.textContent = 'Restore Backup';
                  }
                }}
                className="px-4 py-2 rounded-lg bg-blue-500/20 text-blue-400 border border-blue-500/20 hover:bg-blue-500/30 transition text-sm"
              >
                Restore Backup
              </button>
            </div>
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
