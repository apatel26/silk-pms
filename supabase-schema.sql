-- American Inn and RV Park - Silk PMS Database Schema (Simplified)
-- Run this in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Drop existing tables if they exist
DROP TABLE IF EXISTS backup_records CASCADE;
DROP TABLE IF EXISTS audit_log CASCADE;
DROP TABLE IF EXISTS housekeeping_tasks CASCADE;
DROP TABLE IF EXISTS extra_charges CASCADE;
DROP TABLE IF EXISTS entries CASCADE;
DROP TABLE IF EXISTS customers CASCADE;
DROP TABLE IF EXISTS rv_sites CASCADE;
DROP TABLE IF EXISTS rooms CASCADE;
DROP TABLE IF EXISTS rate_plans CASCADE;
DROP TABLE IF EXISTS roles CASCADE;
DROP TABLE IF EXISTS property_settings CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Property Settings
CREATE TABLE property_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT DEFAULT 'American Inn and RV Park',
  logo_url TEXT,
  address TEXT,
  phone TEXT,
  city_tax_rate NUMERIC(5,4) DEFAULT 0.07,
  state_tax_rate NUMERIC(5,4) DEFAULT 0.06,
  default_room_rate NUMERIC(10,2) DEFAULT 70.00,
  default_pet_fee NUMERIC(10,2) DEFAULT 20.00,
  weekly_30amp NUMERIC(10,2) DEFAULT 200.00,
  weekly_50amp NUMERIC(10,2) DEFAULT 230.00,
  monthly_30amp NUMERIC(10,2) DEFAULT 400.00,
  monthly_50amp NUMERIC(10,2) DEFAULT 500.00,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Rate Plans
CREATE TABLE rate_plans (
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
CREATE TABLE rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  number TEXT UNIQUE NOT NULL,
  floor INTEGER DEFAULT 1,
  type TEXT DEFAULT 'single' CHECK (type IN ('single', 'double', 'suite')),
  base_price NUMERIC(10,2) DEFAULT 70.00,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RV Sites (1-15)
CREATE TABLE rv_sites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_number TEXT UNIQUE NOT NULL,
  amp_type TEXT DEFAULT '30amp' CHECK (amp_type IN ('30amp', '50amp')),
  base_price NUMERIC(10,2) DEFAULT 50.00,
  weekly_price NUMERIC(10,2) DEFAULT 200.00,
  monthly_price NUMERIC(10,2) DEFAULT 400.00,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Customers
CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  photo_url TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Entries (using room_number and site_number as text for simplicity)
CREATE TABLE entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_type TEXT NOT NULL CHECK (entry_type IN ('guest', 'rv')),
  date DATE NOT NULL,
  room_number TEXT,
  site_number TEXT,
  customer_id UUID REFERENCES customers(id),
  customer_name TEXT,
  rate_plan_id UUID REFERENCES rate_plans(id),
  check_in DATE,
  check_out DATE,
  room_rate NUMERIC(10,2) DEFAULT 0,
  num_nights INTEGER DEFAULT 1,
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
  group_id UUID,
  is_group_main BOOLEAN DEFAULT false,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Housekeeping Tasks
CREATE TABLE housekeeping_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  room_id UUID REFERENCES rooms(id),
  room_number TEXT NOT NULL,
  status TEXT DEFAULT 'dirty' CHECK (status IN ('dirty', 'cleaned', 'skip', 'occupied', 'out_of_order')),
  notes TEXT,
  assigned_to TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Roles
CREATE TABLE roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  permissions JSONB DEFAULT '[]',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Users
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  full_name TEXT,
  role TEXT DEFAULT 'staff' CHECK (role IN ('admin', 'manager', 'staff')),
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Audit Log
CREATE TABLE audit_log (
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
CREATE TABLE backup_records (
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
CREATE INDEX IF NOT EXISTS idx_entries_room ON entries(room_number);
CREATE INDEX IF NOT EXISTS idx_entries_site ON entries(site_number);
CREATE INDEX IF NOT EXISTS idx_entries_customer ON entries(customer_id);
CREATE INDEX IF NOT EXISTS idx_housekeeping_date ON housekeeping_tasks(date);
CREATE INDEX IF NOT EXISTS idx_audit_log_user ON audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created ON audit_log(created_at);

-- Disable RLS
ALTER TABLE property_settings FORCE ROW LEVEL SECURITY;
ALTER TABLE rate_plans FORCE ROW LEVEL SECURITY;
ALTER TABLE rooms FORCE ROW LEVEL SECURITY;
ALTER TABLE rv_sites FORCE ROW LEVEL SECURITY;
ALTER TABLE customers FORCE ROW LEVEL SECURITY;
ALTER TABLE entries FORCE ROW LEVEL SECURITY;
ALTER TABLE housekeeping_tasks FORCE ROW LEVEL SECURITY;
ALTER TABLE roles FORCE ROW LEVEL SECURITY;
ALTER TABLE users FORCE ROW LEVEL SECURITY;
ALTER TABLE audit_log FORCE ROW LEVEL SECURITY;
ALTER TABLE backup_records FORCE ROW LEVEL SECURITY;

-- Insert default property settings
INSERT INTO property_settings (name, city_tax_rate, state_tax_rate, default_room_rate, default_pet_fee)
VALUES ('American Inn and RV Park', 0.07, 0.06, 70.00, 20.00)
ON CONFLICT DO NOTHING;

-- Insert default rate plan
INSERT INTO rate_plans (name, description, base_rate, tax_c_rate, tax_s_rate)
VALUES ('Standard', 'Standard room rate with tax', 70.00, 0.07, 0.06)
ON CONFLICT DO NOTHING;

-- Insert default role
INSERT INTO roles (name, permissions)
VALUES ('Admin', '["all"]')
ON CONFLICT DO NOTHING;

-- Insert admin user (password: admin123)
INSERT INTO users (username, password_hash, full_name, role)
VALUES ('admin', 'admin123', 'Administrator', 'admin')
ON CONFLICT (username) DO NOTHING;

-- Insert rooms 101-112
INSERT INTO rooms (number, floor, type, base_price) VALUES
('101', 1, 'single', 70.00),
('102', 1, 'single', 70.00),
('103', 1, 'single', 70.00),
('104', 1, 'single', 70.00),
('105', 1, 'single', 70.00),
('106', 1, 'single', 70.00),
('107', 1, 'single', 70.00),
('108', 1, 'single', 70.00),
('109', 1, 'single', 70.00),
('110', 1, 'single', 70.00),
('111', 1, 'single', 70.00),
('112', 1, 'single', 70.00)
ON CONFLICT (number) DO NOTHING;

-- Insert rooms 201-212
INSERT INTO rooms (number, floor, type, base_price) VALUES
('201', 2, 'single', 70.00),
('202', 2, 'double', 70.00),
('203', 2, 'single', 70.00),
('204', 2, 'double', 70.00),
('205', 2, 'single', 70.00),
('206', 2, 'double', 70.00),
('207', 2, 'single', 70.00),
('208', 2, 'double', 70.00),
('209', 2, 'single', 70.00),
('210', 2, 'double', 70.00),
('211', 2, 'single', 70.00),
('212', 2, 'double', 70.00)
ON CONFLICT (number) DO NOTHING;

-- Insert RV sites 1-15
INSERT INTO rv_sites (site_number, amp_type, base_price, weekly_price, monthly_price) VALUES
('1', '30amp', 50.00, 200.00, 400.00),
('2', '30amp', 50.00, 200.00, 400.00),
('3', '30amp', 50.00, 200.00, 400.00),
('4', '30amp', 50.00, 200.00, 400.00),
('5', '30amp', 50.00, 200.00, 400.00),
('6', '30amp', 50.00, 200.00, 400.00),
('7', '30amp', 50.00, 200.00, 400.00),
('8', '30amp', 50.00, 200.00, 400.00),
('9', '30amp', 50.00, 200.00, 400.00),
('10', '30amp', 50.00, 200.00, 400.00),
('11', '50amp', 50.00, 230.00, 500.00),
('12', '50amp', 50.00, 230.00, 500.00),
('13', '50amp', 50.00, 230.00, 500.00),
('14', '50amp', 50.00, 230.00, 500.00),
('15', '50amp', 50.00, 230.00, 500.00)
ON CONFLICT (site_number) DO NOTHING;
