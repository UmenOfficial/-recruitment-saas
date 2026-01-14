-- =====================================================
-- MIGRATION: Split Questions into Aptitude and Personality
-- =====================================================

-- 1. Add 'type' column to questions table
-- Default to 'APTITUDE' for existing questions since they have correct answers.
ALTER TABLE questions 
ADD COLUMN IF NOT EXISTS type VARCHAR(20) DEFAULT 'APTITUDE' CHECK (type IN ('APTITUDE', 'PERSONALITY'));

-- 2. Relax 'correct_answer' constraint
-- Personality questions do not have a single correct answer.
ALTER TABLE questions 
ALTER COLUMN correct_answer DROP NOT NULL;

-- 3. Update existing questions to be 'APTITUDE' (redundant with default but safe)
UPDATE questions SET type = 'APTITUDE' WHERE type IS NULL;
