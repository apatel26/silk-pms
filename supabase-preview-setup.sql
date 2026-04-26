-- Preview Supabase Setup Script
-- Run this in your preview Supabase SQL Editor (ygkvrahxfnsvbvitrkxq)
-- This creates the schema for PMS and is ready to receive data from production

-- ============================================
-- STEP 1: Create Tables (run this first)
-- ============================================

-- Drop existing tables if any (to start fresh)
DROP TABLE IF EXISTS entries CASCADE;
DROP TABLE IF EXISTS customers CASCADE;
DROP TABLE IF EXISTS rooms CASCADE;
DROP TABLE IF EXISTS rv_sites CASCADE;
DROP TABLE IF EXISTS roles CASCADE;
DROP TABLE IF EXISTS rate_plans CASCADE;
DROP TABLE IF EXISTS property_settings CASCADE;
DROP TABLE IF EXISTS housekeeping_tasks CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS backup_records CASCADE;
DROP TABLE IF EXISTS audit_log CASCADE;

-- Create tables in order (respecting foreign keys)

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  full_name TEXT,
  role TEXT DEFAULT 'staff',
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  photo_url TEXT
);

CREATE TABLE roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  permissions JSONB DEFAULT '[]',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE rate_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  base_rate NUMERIC NOT NULL,
  tax_c_rate NUMERIC DEFAULT 0.07,
  tax_s_rate NUMERIC DEFAULT 0.06,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE property_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT DEFAULT 'American Inn and RV Park',
  logo_url TEXT,
  address TEXT,
  phone TEXT,
  city_tax_rate NUMERIC DEFAULT 0.07,
  state_tax_rate NUMERIC DEFAULT 0.06,
  default_room_rate NUMERIC DEFAULT 70.00,
  default_pet_fee NUMERIC DEFAULT 20.00,
  weekly_30amp NUMERIC DEFAULT 200.00,
  weekly_50amp NUMERIC DEFAULT 230.00,
  monthly_30amp NUMERIC DEFAULT 400.00,
  monthly_50amp NUMERIC DEFAULT 500.00,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  number TEXT NOT NULL UNIQUE,
  floor INTEGER DEFAULT 1,
  type TEXT DEFAULT 'single',
  base_price NUMERIC DEFAULT 70.00,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE rv_sites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_number TEXT NOT NULL UNIQUE,
  amp_type TEXT DEFAULT '30amp',
  base_price NUMERIC DEFAULT 50.00,
  weekly_price NUMERIC DEFAULT 200.00,
  monthly_price NUMERIC DEFAULT 400.00,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  photo_url TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_type TEXT NOT NULL,
  date DATE NOT NULL,
  room_number TEXT,
  site_number TEXT,
  customer_id UUID REFERENCES customers(id),
  customer_name TEXT,
  rate_plan_id UUID REFERENCES rate_plans(id),
  check_in DATE,
  check_out DATE,
  room_rate NUMERIC DEFAULT 0,
  num_nights INTEGER DEFAULT 1,
  tax_c NUMERIC DEFAULT 0,
  tax_s NUMERIC DEFAULT 0,
  pet_fee NUMERIC DEFAULT 0,
  pet_count INTEGER DEFAULT 0,
  extra_charges JSONB DEFAULT '[]',
  subtotal NUMERIC DEFAULT 0,
  total NUMERIC DEFAULT 0,
  cash NUMERIC,
  cc NUMERIC,
  note TEXT,
  is_refund BOOLEAN DEFAULT false,
  refund_amount NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'active',
  group_id TEXT,
  is_group_main BOOLEAN DEFAULT false,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE housekeeping_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  room_id UUID REFERENCES rooms(id),
  room_number TEXT NOT NULL,
  status TEXT DEFAULT 'dirty',
  notes TEXT,
  assigned_to TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  username TEXT,
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id TEXT,
  details JSONB,
  ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE backup_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  year INTEGER NOT NULL,
  month INTEGER,
  file_type TEXT CHECK (file_type IN ('xlsx', 'pdf', 'json')),
  file_url TEXT,
  file_size INTEGER,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Disable RLS for preview (easier for testing)
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE roles DISABLE ROW LEVEL SECURITY;
ALTER TABLE rate_plans DISABLE ROW LEVEL SECURITY;
ALTER TABLE property_settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE rooms DISABLE ROW LEVEL SECURITY;
ALTER TABLE rv_sites DISABLE ROW LEVEL SECURITY;
ALTER TABLE customers DISABLE ROW LEVEL SECURITY;
ALTER TABLE entries DISABLE ROW LEVEL SECURITY;
ALTER TABLE housekeeping_tasks DISABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log DISABLE ROW LEVEL SECURITY;
ALTER TABLE backup_records DISABLE ROW LEVEL SECURITY;

-- ============================================
-- INSTRUCTIONS FOR SETUP
-- ============================================
-- 1. Run this script in your preview Supabase to create tables
-- 2. Data will be copied separately via INSERT statements
-- 3. The preview database uses PREVIEW_SUPABASE_URL env var
-- 4. Production database uses NEXT_PUBLIC_SUPABASE_URL env var
