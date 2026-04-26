-- Silk PMS Cloud Backup - Supabase Setup
-- Run this in your new Supabase project's SQL Editor (in order, one by one)

-- Step 1: Create storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('silk-pms-backups', 'silk-pms-backups', false, 52428800);

-- Step 2: Create backups metadata table
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

-- Step 3: Enable RLS on the table
ALTER TABLE public.silk_pms_backups ENABLE ROW LEVEL SECURITY;

-- Step 4: Storage policies (run these separately if needed)
DROP POLICY IF EXISTS "Authenticated users can view backups" ON storage.objects;
CREATE POLICY "Authenticated users can view backups"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'silk-pms-backups');

DROP POLICY IF EXISTS "Authenticated users can upload backups" ON storage.objects;
CREATE POLICY "Authenticated users can upload backups"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'silk-pms-backups');

DROP POLICY IF EXISTS "Authenticated users can delete backups" ON storage.objects;
CREATE POLICY "Authenticated users can delete backups"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'silk-pms-backups');

-- Step 5: Table policies
DROP POLICY IF EXISTS "Anyone authenticated can view backup metadata" ON public.silk_pms_backups;
CREATE POLICY "Anyone authenticated can view backup metadata"
  ON public.silk_pms_backups FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Anyone authenticated can insert backup metadata" ON public.silk_pms_backups;
CREATE POLICY "Anyone authenticated can insert backup metadata"
  ON public.silk_pms_backups FOR INSERT
  TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone authenticated can delete backup metadata" ON public.silk_pms_backups;
CREATE POLICY "Anyone authenticated can delete backup metadata"
  ON public.silk_pms_backups FOR DELETE
  TO authenticated
  USING (true);
