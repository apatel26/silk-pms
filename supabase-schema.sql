-- PMS Database Schema for Supabase
-- Matches the Excel layout exactly with multi-user auth

-- Users table for authentication
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  full_name TEXT,
  role TEXT DEFAULT 'staff' CHECK (role IN ('admin', 'manager', 'staff')),
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Single table for all daily entries (both guest rooms and RV sites)
CREATE TABLE IF NOT EXISTS daily_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  room_number INTEGER NOT NULL, -- For RV: site_number
  entry_type TEXT DEFAULT 'guest' CHECK (entry_type IN ('guest', 'rv')),
  name TEXT,
  check_in DATE,
  check_out DATE,
  rate NUMERIC(10,2) DEFAULT 0,
  tax_c NUMERIC(10,2) DEFAULT 0, -- City tax 7%
  tax_s NUMERIC(10,2) DEFAULT 0, -- State tax 6%
  total NUMERIC(10,2) DEFAULT 0,
  cash NUMERIC(10,2),
  cc NUMERIC(10,2),
  note TEXT, -- For refunds, deposits, etc.
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_entries ENABLE ROW LEVEL SECURITY;

-- Disable RLS (we're using app-level auth)
ALTER TABLE users FORCE ROW LEVEL SECURITY;
ALTER TABLE daily_entries FORCE ROW LEVEL SECURITY;

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_entries_date ON daily_entries(date);
CREATE INDEX IF NOT EXISTS idx_entries_room ON daily_entries(room_number);
CREATE INDEX IF NOT EXISTS idx_entries_type ON daily_entries(entry_type);
CREATE INDEX IF NOT EXISTS idx_entries_date_room ON daily_entries(date, room_number);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);

-- Insert default admin user (password: admin123 - change this!)
-- In production, use bcrypt to hash passwords properly
INSERT INTO users (username, password_hash, full_name, role)
VALUES ('admin', 'admin123', 'Administrator', 'admin')
ON CONFLICT (username) DO NOTHING;
