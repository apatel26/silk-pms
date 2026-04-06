-- Add missing columns to entries table
-- Run this in your Supabase SQL Editor to fix entry saving

-- Add num_nights column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'entries' AND column_name = 'num_nights') THEN
    ALTER TABLE entries ADD COLUMN num_nights INTEGER DEFAULT 1;
  END IF;
END $$;

-- Add group_id column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'entries' AND column_name = 'group_id') THEN
    ALTER TABLE entries ADD COLUMN group_id UUID;
  END IF;
END $$;

-- Add is_group_main column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'entries' AND column_name = 'is_group_main') THEN
    ALTER TABLE entries ADD COLUMN is_group_main BOOLEAN DEFAULT false;
  END IF;
END $$;

-- Verify the columns were added
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'entries'
AND column_name IN ('num_nights', 'group_id', 'is_group_main');
