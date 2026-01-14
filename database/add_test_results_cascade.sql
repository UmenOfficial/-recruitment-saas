-- Add Cascade Delete to test_results FK

-- 1. Drop existing FK constraint
ALTER TABLE test_results
DROP CONSTRAINT IF EXISTS test_results_test_id_fkey;

-- 2. Clean up orphan data (optional but good practice before adding constraint if inconsistent state exists, though typical foreign key usually prevents it)
-- DELETE FROM test_results WHERE test_id NOT IN (SELECT id FROM tests);

-- 3. Add new FK constraint with ON DELETE CASCADE
ALTER TABLE test_results
ADD CONSTRAINT test_results_test_id_fkey
FOREIGN KEY (test_id)
REFERENCES tests(id)
ON DELETE CASCADE;

-- Note: This ensures that when a Test is deleted, all associated Test Results are also deleted.
