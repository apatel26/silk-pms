// Types matching the Excel structure exactly
export interface GuestEntry {
  id: string;
  date: string; // YYYY-MM-DD format
  room_number: number;
  name: string;
  check_in: string; // YYYY-MM-DD
  check_out: string; // YYYY-MM-DD
  rate: number;
  tax_c: number; // Tx-C 7%
  tax_s: number; // Tx-S 6%
  total: number;
  cash: number | null;
  cc: number | null;
}

export interface RVEntry {
  id: string;
  date: string; // YYYY-MM-DD format
  site_number: number;
  name: string;
  check_in: string; // YYYY-MM-DD
  check_out: string; // YYYY-MM-DD
  rate: number;
  cash: number | null;
  cc: number | null;
  note: string | null;
}

export interface DailySummary {
  date: string;
  num_rooms: number;
  total_rate: number;
  total_tax_c: number;
  total_tax_s: number;
  total: number;
  total_cash: number;
  total_cc: number;
}

export interface MonthlyData {
  month: string; // YYYY-MM
  guests: GuestEntry[];
  rv_entries: RVEntry[];
  daily_summaries: DailySummary[];
}
