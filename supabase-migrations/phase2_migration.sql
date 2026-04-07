-- Phase 2 Database Migration
-- Run this in your Supabase SQL Editor

-- Add photo_url column to users table if it doesn't exist
ALTER TABLE users ADD COLUMN IF NOT EXISTS photo_url TEXT;

-- Add permissions column to roles table if it doesn't exist
ALTER TABLE roles ADD COLUMN IF NOT EXISTS permissions JSONB DEFAULT '[]';

-- Create audit_log table if it doesn't exist
CREATE TABLE IF NOT EXISTS audit_log (
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

-- Create backup_records table if it doesn't exist
CREATE TABLE IF NOT EXISTS backup_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  year INTEGER NOT NULL,
  month INTEGER,
  file_type TEXT CHECK (file_type IN ('xlsx', 'pdf', 'json')),
  file_url TEXT,
  file_size INTEGER,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes for audit_log if they don't exist
CREATE INDEX IF NOT EXISTS idx_audit_log_user ON audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created ON audit_log(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_log_action ON audit_log(action);

-- Create indexes for backup_records
CREATE INDEX IF NOT EXISTS idx_backup_records_year ON backup_records(year);

-- Insert default roles if they don't exist
INSERT INTO roles (name, permissions) VALUES
('Admin', '["all"]'),
('Manager', '["dashboard:view", "entries:view", "entries:add", "entries:edit", "housekeeping:view", "housekeeping:edit", "reports:view", "reports:export", "settings:view"]'),
('Staff', '["dashboard:view", "entries:view", "entries:add", "housekeeping:view", "housekeeping:edit"]')
ON CONFLICT DO NOTHING;

-- Ensure the roles table has is_active column
ALTER TABLE roles ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Grant permissions to new columns
GRANT ALL ON audit_log TO anon;
GRANT ALL ON backup_records TO anon;
GRANT ALL ON audit_log TO authenticated;
GRANT ALL ON backup_records TO authenticated;