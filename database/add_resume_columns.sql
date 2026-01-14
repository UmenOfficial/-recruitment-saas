-- Add columns for resuming test and random order persistence
ALTER TABLE test_results 
ADD COLUMN IF NOT EXISTS questions_order JSONB, -- Stores the shuffled array of question IDs
ADD COLUMN IF NOT EXISTS elapsed_seconds INTEGER DEFAULT 0, -- Track active time spent
ADD COLUMN IF NOT EXISTS current_index INTEGER DEFAULT 0, -- Track last position
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id); -- Direct link to user if application_id is not used

-- Create index for faster lookup by user and test
CREATE INDEX IF NOT EXISTS idx_test_results_user_test ON test_results(user_id, test_id);
