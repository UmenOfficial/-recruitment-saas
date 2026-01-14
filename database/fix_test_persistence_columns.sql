-- ================================================================
-- Add missing columns for Personality Test Resume & Persistence
-- ================================================================

-- 1. Add columns to test_results table (for saving progress and order)
ALTER TABLE test_results
ADD COLUMN IF NOT EXISTS questions_order JSONB,
ADD COLUMN IF NOT EXISTS current_index INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS elapsed_seconds INTEGER DEFAULT 0;

-- 2. Add is_practice column to test_questions table (for skipping practice questions)
ALTER TABLE test_questions
ADD COLUMN IF NOT EXISTS is_practice BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN test_questions.is_practice IS 'if true, this question is skipped when resuming a test session';

-- 3. (Optional) Update existing test_questions to have false for is_practice if null
UPDATE test_questions SET is_practice = FALSE WHERE is_practice IS NULL;
