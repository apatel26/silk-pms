-- American Inn and RV Park - Silk PMS Database Schema
-- Run this in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Property Settings (singleton)
CREATE TABLE IF NOT EXISTS property_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT DEFAULT 'American Inn and RV Park',
  logo_url TEXT,
  address TEXT,
  phone TEXT,
  city_tax_rate NUMERIC(5,4) DEFAULT 0.07,
  state_tax_rate NUMERIC(5,4) DEFAULT 0.06,
  default_room_rate NUMERIC(10,2) DEFAULT 70.00,
  default_pet_fee NUMERIC(10,2) DEFAULT 20.00,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Rate Plans
CREATE TABLE IF NOT EXISTS rate_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  base_rate NUMERIC(10,2) NOT NULL,
  tax_c_rate NUMERIC(5,4) DEFAULT 0.07,
  tax_s_rate NUMERIC(5,4) DEFAULT 0.06,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Rooms (101-212)
CREATE TABLE IF NOT EXISTS rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  number TEXT UNIQUE NOT NULL,
  floor INTEGER DEFAULT 1,
  type TEXT DEFAULT 'single' CHECK (type IN ('single', 'double', 'suite')),
  base_price NUMERIC(10,2) DEFAULT 70.00,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RV Sites (1-15)
CREATE TABLE IF NOT EXISTS rv_sites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_number TEXT UNIQUE NOT NULL,
  amp_type TEXT DEFAULT '30amp' CHECK (amp_type IN ('30amp', '50amp')),
  base_price NUMERIC(10,2) DEFAULT 50.00,
  weekly_price NUMERIC(10,2),
  monthly_price NUMERIC(10,2),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Customers
CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  photo_url TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Daily Entries (unified for guest rooms and RV)
CREATE TABLE IF NOT EXISTS entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_type TEXT NOT NULL CHECK (entry_type IN ('guest', 'rv')),
  date DATE NOT NULL,
  room_id UUID REFERENCES rooms(id),
  site_id UUID REFERENCES rv_sites(id),
  customer_id UUID REFERENCES customers(id),
  customer_name TEXT,
  rate_plan_id UUID REFERENCES rate_plans(id),
  check_in DATE,
  check_out DATE,
  room_rate NUMERIC(10,2) DEFAULT 0,
  tax_c NUMERIC(10,2) DEFAULT 0,
  tax_s NUMERIC(10,2) DEFAULT 0,
  pet_fee NUMERIC(10,2) DEFAULT 0,
  pet_count INTEGER DEFAULT 0,
  extra_charges JSONB DEFAULT '[]',
  subtotal NUMERIC(10,2) DEFAULT 0,
  total NUMERIC(10,2) DEFAULT 0,
  cash NUMERIC(10,2),
  cc NUMERIC(10,2),
  note TEXT,
  is_refund BOOLEAN DEFAULT false,
  refund_amount NUMERIC(10,2) DEFAULT 0,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'checked_out', 'cancelled')),
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Extra Charges (for reference/reports)
CREATE TABLE IF NOT EXISTS extra_charges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_id UUID REFERENCES entries(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  amount NUMERIC(10,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Housekeeping Tasks
CREATE TABLE IF NOT EXISTS housekeeping_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  room_id UUID REFERENCES rooms(id),
  room_number TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'cleaned', 'skip')),
  notes TEXT,
  assigned_to TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Roles (customizable)
CREATE TABLE IF NOT EXISTS roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  permissions JSONB DEFAULT '[]',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Users
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  full_name TEXT,
  photo_url TEXT,
  role_id UUID REFERENCES roles(id),
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Audit Log
CREATE TABLE IF NOT EXISTS audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  username TEXT,
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id TEXT,
  details JSONB,
  ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Backup Records
CREATE TABLE IF NOT EXISTS backup_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  year INTEGER NOT NULL,
  month INTEGER,
  file_type TEXT CHECK (file_type IN ('xlsx', 'pdf')),
  file_url TEXT,
  file_size INTEGER,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_entries_date ON entries(date);
CREATE INDEX IF NOT EXISTS idx_entries_type ON entries(entry_type);
CREATE INDEX IF NOT EXISTS idx_entries_room ON entries(room_id);
CREATE INDEX IF NOT EXISTS idx_entries_site ON entries(site_id);
CREATE INDEX IF NOT EXISTS idx_entries_customer ON entries(customer_id);
CREATE INDEX IF NOT EXISTS idx_housekeeping_date ON housekeeping_tasks(date);
CREATE INDEX IF NOT EXISTS idx_audit_log_user ON audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created ON audit_log(created_at);

-- Disable RLS (using app-level auth)
ALTER TABLE property_settings FORCE ROW LEVEL SECURITY;
ALTER TABLE rate_plans FORCE ROW LEVEL SECURITY;
ALTER TABLE rooms FORCE ROW LEVEL SECURITY;
ALTER TABLE rv_sites FORCE ROW LEVEL SECURITY;
ALTER TABLE customers FORCE ROW LEVEL SECURITY;
ALTER TABLE entries FORCE ROW LEVEL SECURITY;
ALTER TABLE extra_charges FORCE ROW LEVEL SECURITY;
ALTER TABLE housekeeping_tasks FORCE ROW LEVEL SECURITY;
ALTER TABLE roles FORCE ROW LEVEL SECURITY;
ALTER TABLE users FORCE ROW LEVEL SECURITY;
ALTER TABLE audit_log FORCE ROW LEVEL SECURITY;
ALTER TABLE backup_records FORCE ROW LEVEL SECURITY;

-- Insert default rate plan
INSERT INTO rate_plans (name, description, base_rate, tax_c_rate, tax_s_rate)
VALUES ('Standard', 'Standard room rate with tax', 70.00, 0.07, 0.06)
ON CONFLICT DO NOTHING;

-- Insert default property settings
INSERT INTO property_settings (name, city_tax_rate, state_tax_rate, default_room_rate, default_pet_fee)
VALUES ('American Inn and RV Park', 0.07, 0.06, 70.00, 20.00)
ON CONFLICT DO NOTHING;

-- Insert default role (admin)
INSERT INTO roles (name, permissions)
VALUES ('Admin', '["all"]')
ON CONFLICT DO NOTHING;

-- Insert admin user (password: admin123)
INSERT INTO users (username, password_hash, full_name, role_id)
SELECT 'admin', 'admin123', 'Administrator', id FROM roles WHERE name = 'Admin'
ON CONFLICT (username) DO NOTHING;

-- Insert rooms 101-112 and 201-212
DO $$
DECLARE
  i INTEGER;
BEGIN
  FOR i IN 101..112 LOOP
    INSERT INTO rooms (number, floor, type, base_price)
    VALUES (i::TEXT, 1, CASE WHEN i >= 201 THEN 2 ELSE 1 END, 70.00)
    ON CONFLICT (number) DO NOTHING;
  END LOOP;
  FOR i IN 201..212 LOOP
    INSERT INTO rooms (number, floor, type, base_price)
    VALUES (i::TEXT, 2, CASE WHEN MOD(i, 2) = 0 THEN 'double' ELSE 'single' END, 70.00)
    ON CONFLICT (number) DO NOTHING;
  END LOOP;
END $$;

-- Insert RV sites 1-15
DO $$
DECLARE
  i INTEGER;
BEGIN
  FOR i IN 1..15 LOOP
    INSERT INTO rv_sites (site_number, amp_type, base_price, weekly_price, monthly_price)
    VALUES (i::TEXT, CASE WHEN i <= 10 THEN '30amp' ELSE '50amp' END, 50.00, 300.00, 1000.00)
    ON CONFLICT (site_number) DO NOTHING;
  END LOOP;
END $$;
