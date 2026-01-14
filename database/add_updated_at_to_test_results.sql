-- ================================================================
-- Add missing 'updated_at' column to test_results
-- ================================================================

ALTER TABLE test_results 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Reload schema cache (functionality depends on Client/Supabase interaction, 
-- usually executing DDL is enough to refresh)
