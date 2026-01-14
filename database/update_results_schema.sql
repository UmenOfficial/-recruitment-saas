-- =====================================================
-- Update test_results table for Multi-Attempt & Detailed Scores
-- =====================================================

-- 1. Add new columns
ALTER TABLE test_results
ADD COLUMN IF NOT EXISTS test_id UUID REFERENCES tests(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS attempt_number INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS detailed_scores JSONB DEFAULT '{}'::jsonb;

-- 2. Data Migration: Populate user_id from applications table
UPDATE test_results
SET user_id = apps.user_id
FROM applications apps
WHERE test_results.application_id = apps.id
AND test_results.user_id IS NULL;

-- 3. Create Performance Index (Composite Index)
-- Optimizes queries filtering by User + Test, sorted by latest attempt.
CREATE INDEX IF NOT EXISTS idx_test_results_user_test_attempt
ON test_results(user_id, test_id, attempt_number DESC);

-- 4. Add Constraint
-- Ensures that for a specific application and test, the attempt number is unique.
-- NOTE: If test_id is NULL for existing records, this might behave differently (NULL != NULL in SQL usually), 
-- but for new records it guarantees unique attempt numbering.
ALTER TABLE test_results
ADD CONSTRAINT uq_test_results_attempt 
UNIQUE NULLS NOT DISTINCT (application_id, test_id, attempt_number);
