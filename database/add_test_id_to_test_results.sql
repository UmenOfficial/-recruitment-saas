-- Add test_id column to test_results table
ALTER TABLE test_results ADD COLUMN test_id UUID REFERENCES tests(id);

-- Optional: Create index for better performance
CREATE INDEX idx_test_results_test_id ON test_results(test_id);
