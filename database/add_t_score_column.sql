-- Add t_score column to test_results table
ALTER TABLE test_results 
ADD COLUMN IF NOT EXISTS t_score NUMERIC(10, 2);

-- Comment on column
COMMENT ON COLUMN test_results.t_score IS 'Calculated T-Score based on norms (Mean 50, SD 10)';
