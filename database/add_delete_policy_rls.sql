-- ================================================================
-- Allow users to DELETE their own test results (required for "Start from beginning")
-- ================================================================

-- Create Policy: DELETE
CREATE POLICY "Users can delete their own test results"
ON test_results FOR DELETE
USING (auth.uid() = user_id);

-- Verify
-- SELECT * FROM pg_policies WHERE tablename = 'test_results';
