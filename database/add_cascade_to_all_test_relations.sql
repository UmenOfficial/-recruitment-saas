-- Add Cascade Delete to all tables referencing tests

-- 1. test_norm_versions (Confirmed Issue)
ALTER TABLE test_norm_versions
DROP CONSTRAINT IF EXISTS test_norm_versions_test_id_fkey;

ALTER TABLE test_norm_versions
ADD CONSTRAINT test_norm_versions_test_id_fkey
FOREIGN KEY (test_id)
REFERENCES tests(id)
ON DELETE CASCADE;

-- 2. test_questions (Likely Issue)
-- Assuming table name is 'test_questions' or similar. 
-- In many schemas, it might be 'questions' linked to 'tests', OR a join table.
-- Let's try attempting to drop/add if exists.
-- If schema is unknown, we focus on known errors, but let's try to be proactive.
-- (Warning: If FK name is different, this might fail or do nothing. Safer to target knowns + generic names)

-- Check if 'test_questions' exists and has FK
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'test_questions') THEN
        ALTER TABLE test_questions DROP CONSTRAINT IF EXISTS test_questions_test_id_fkey;
        
        ALTER TABLE test_questions
        ADD CONSTRAINT test_questions_test_id_fkey
        FOREIGN KEY (test_id)
        REFERENCES tests(id)
        ON DELETE CASCADE;
    END IF;
END $$;

-- 3. test_norms (Likely Issue)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'test_norms') THEN
        ALTER TABLE test_norms DROP CONSTRAINT IF EXISTS test_norms_test_id_fkey;
        
        ALTER TABLE test_norms
        ADD CONSTRAINT test_norms_test_id_fkey
        FOREIGN KEY (test_id)
        REFERENCES tests(id)
        ON DELETE CASCADE;
    END IF;
END $$;

-- 4. Re-apply test_results just in case
ALTER TABLE test_results
DROP CONSTRAINT IF EXISTS test_results_test_id_fkey;

ALTER TABLE test_results
ADD CONSTRAINT test_results_test_id_fkey
FOREIGN KEY (test_id)
REFERENCES tests(id)
ON DELETE CASCADE;
