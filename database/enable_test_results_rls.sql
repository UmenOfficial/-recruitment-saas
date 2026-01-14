-- ================================================================
-- Ensure RLS is enabled and policies allow UPDATE for candidates
-- ================================================================

-- 1. Enable RLS on test_results (if not already enabled)
ALTER TABLE test_results ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing policies to avoid conflicts (optional but safer for this script)
DROP POLICY IF EXISTS "Users can view their own test results" ON test_results;
DROP POLICY IF EXISTS "Users can update their own test results" ON test_results;
DROP POLICY IF EXISTS "Users can insert their own test results" ON test_results;

-- 3. Create Policy: VIEW (Select)
CREATE POLICY "Users can view their own test results"
ON test_results FOR SELECT
USING (auth.uid() = user_id);

-- 4. Create Policy: INSERT
CREATE POLICY "Users can insert their own test results"
ON test_results FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- 5. Create Policy: UPDATE (Critical for saving progress)
CREATE POLICY "Users can update their own test results"
ON test_results FOR UPDATE
USING (auth.uid() = user_id);

-- Verify
-- SELECT * FROM pg_policies WHERE tablename = 'test_results';
