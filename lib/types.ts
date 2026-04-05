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
