-- Silk PMS Cloud Backup - Supabase Setup
-- Run this in your new Supabase project's SQL Editor

-- 1. Create storage bucket for backup files
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed MIME types)
VALUES ('silk-pms-backups', 'silk-pms-backups', false, 52428800, ARRAY['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/pdf']);

-- 2. Create backups table for metadata
CREATE TABLE IF NOT EXISTS public.silk_pms_backups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  year INTEGER NOT NULL,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER,
  entry_count INTEGER,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Enable RLS
ALTER TABLE public.silk_pms_backups ENABLE ROW LEVEL SECURITY;

-- 4. Create storage policies
CREATE POLICY "Authenticated users can view backups"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'silk-pms-backups');

CREATE POLICY "Authenticated users can upload backups"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'silk-pms-backups');

-- 5. Create table policies
CREATE POLICY "Anyone authenticated can view backup metadata"
  ON public.silk_pms_backups FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Anyone authenticated can insert backup metadata"
  ON public.silk_pms_backups FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Anyone authenticated can delete backup metadata"
  ON public.silk_pms_backups FOR DELETE
  TO authenticated
  USING (true);
