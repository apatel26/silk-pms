// Modern PMS Types for American Inn and RV Park

export interface PropertySettings {
  id: string;
  name: string;
  logo_url: string | null;
  address: string | null;
  phone: string | null;
  city_tax_rate: number; // 0.07 = 7%
  state_tax_rate: number; // 0.06 = 6%
  default_room_rate: number;
  default_pet_fee: number;
  created_at: string;
  updated_at: string;
}

export interface RatePlan {
  id: string;
  name: string;
  description: string | null;
  base_rate: number;
  tax_c_rate: number;
  tax_s_rate: number;
  is_active: boolean;
  created_at: string;
}

export interface Room {
  id: string;
  number: string;
  floor: number;
  type: 'single' | 'double' | 'suite';
  amp_type: '30amp' | '50amp' | null; // For RV sites
  base_price: number;
  is_active: boolean;
  created_at: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  photo_url: string | null;
  notes: string | null;
  created_at: string;
}

export interface Entry {
  id: string;
  entry_type: 'guest' | 'rv';
  date: string; // YYYY-MM-DD - the date this entry is for
  room_id: string | null;
  site_id: string | null;
  customer_id: string | null;
  customer_name: string;
  rate_plan_id: string | null;
  check_in: string | null;
  check_out: string | null;
  room_rate: number;
  tax_c: number;
  tax_s: number;
  pet_fee: number;
  pet_count: number;
  extra_charges: ExtraCharge[];
  subtotal: number;
  total: number;
  cash: number | null;
  cc: number | null;
  note: string | null;
  is_refund: boolean;
  refund_amount: number | null;
  status: 'active' | 'checked_out' | 'cancelled';
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface ExtraCharge {
  description: string;
  amount: number;
}

export interface DailySummary {
  date: string;
  total_rooms: number;
  total_rv_sites: number;
  total_guest_rate: number;
  total_guest_tax_c: number;
  total_guest_tax_s: number;
  total_guest_pet_fees: number;
  total_guest_extra: number;
  total_guest: number;
  total_rv_rate: number;
  total_rv_extra: number;
  total_rv: number;
  total_cash: number;
  total_cc: number;
  total_refunds: number;
  net_total: number;
}

export interface HousekeepingTask {
  id: string;
  date: string;
  room_id: string;
  room_number: string;
  status: 'pending' | 'cleaned' | 'skip';
  notes: string | null;
  assigned_to: string | null;
  created_at: string;
  updated_at: string;
}

export interface AuditLog {
  id: string;
  user_id: string;
  username: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  details: string | null;
  ip_address: string | null;
  created_at: string;
}

export interface Role {
  id: string;
  name: string;
  permissions: string[];
  is_active: boolean;
  created_at: string;
}

export interface User {
  id: string;
  username: string;
  password_hash: string;
  full_name: string | null;
  photo_url: string | null;
  role_id: string;
  role: Role | null;
  active: boolean;
  created_at: string;
}

export interface BackupRecord {
  id: string;
  year: number;
  month: number | null;
  file_type: 'xlsx' | 'pdf';
  file_url: string;
  file_size: number;
  created_by: string;
  created_at: string;
}

// Theme Types
export type ThemeName = 'dark' | 'light' | 'midnight' | 'ocean' | 'forest' | 'sunset';
export type UIStyle = 'legacy' | 'silk';

export interface ThemeConfig {
  name: string;
  label: string;
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  surface: string;
  text: string;
  textSecondary: string;
  border: string;
  glassBg: string;
  glassBorder: string;
  success: string;
  warning: string;
  error: string;
}

export const THEMES: Record<ThemeName, ThemeConfig> = {
  dark: {
    name: 'dark',
    label: 'Dark',
    primary: '#f59e0b',
    secondary: '#3b82f6',
    accent: '#f59e0b',
    background: '#020617',
    surface: '#0f172a',
    text: '#ffffff',
    textSecondary: '#94a3b8',
    border: '#1e293b',
    glassBg: 'rgba(15, 23, 42, 0.8)',
    glassBorder: 'rgba(255, 255, 255, 0.1)',
    success: '#22c55e',
    warning: '#eab308',
    error: '#ef4444',
  },
  light: {
    name: 'light',
    label: 'Light',
    primary: '#f59e0b',
    secondary: '#3b82f6',
    accent: '#f59e0b',
    background: '#ffffff',
    surface: '#f8fafc',
    text: '#0f172a',
    textSecondary: '#64748b',
    border: '#e2e8f0',
    glassBg: 'rgba(255, 255, 255, 0.85)',
    glassBorder: 'rgba(0, 0, 0, 0.1)',
    success: '#22c55e',
    warning: '#eab308',
    error: '#ef4444',
  },
  midnight: {
    name: 'midnight',
    label: 'Midnight',
    primary: '#6366f1',
    secondary: '#8b5cf6',
    accent: '#6366f1',
    background: '#0a0f1a',
    surface: '#111827',
    text: '#f1f5f9',
    textSecondary: '#94a3b8',
    border: '#1e293b',
    glassBg: 'rgba(17, 24, 39, 0.8)',
    glassBorder: 'rgba(99, 102, 241, 0.2)',
    success: '#22c55e',
    warning: '#eab308',
    error: '#ef4444',
  },
  ocean: {
    name: 'ocean',
    label: 'Ocean',
    primary: '#06b6d4',
    secondary: '#0ea5e9',
    accent: '#06b6d4',
    background: '#042f2e',
    surface: '#134e4a',
    text: '#f0fdfa',
    textSecondary: '#5eead4',
    border: '#115e59',
    glassBg: 'rgba(20, 78, 74, 0.8)',
    glassBorder: 'rgba(6, 182, 212, 0.2)',
    success: '#22c55e',
    warning: '#eab308',
    error: '#ef4444',
  },
  forest: {
    name: 'forest',
    label: 'Forest',
    primary: '#22c55e',
    secondary: '#16a34a',
    accent: '#22c55e',
    background: '#052e16',
    surface: '#14532d',
    text: '#f0fdf4',
    textSecondary: '#86efac',
    border: '#166534',
    glassBg: 'rgba(20, 83, 45, 0.8)',
    glassBorder: 'rgba(34, 197, 94, 0.2)',
    success: '#22c55e',
    warning: '#eab308',
    error: '#ef4444',
  },
  sunset: {
    name: 'sunset',
    label: 'Sunset',
    primary: '#f97316',
    secondary: '#ea580c',
    accent: '#f97316',
    background: '#1c0a00',
    surface: '#2d1810',
    text: '#fff7ed',
    textSecondary: '#fed7aa',
    border: '#431407',
    glassBg: 'rgba(45, 24, 16, 0.8)',
    glassBorder: 'rgba(249, 115, 22, 0.2)',
    success: '#22c55e',
    warning: '#eab308',
    error: '#ef4444',
  },
};
