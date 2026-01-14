-- Add is_practice column to test_questions table
ALTER TABLE test_questions
ADD COLUMN IF NOT EXISTS is_practice BOOLEAN DEFAULT FALSE;

-- Notify admin to update practice questions manually
COMMENT ON COLUMN test_questions.is_practice IS 'if true, this question is skipped when resuming a test session';
