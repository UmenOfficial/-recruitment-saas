-- TEMPORARY DEBUG POLICY
-- This allows ANYONE (even anon) to read test_results.
-- Use this ONLY to verify if RLS logic is the blocker.
-- If this works, the issue is specifically `auth.uid()`.

CREATE POLICY "DEBUG_OPEN_ACCESS"
ON public.test_results
FOR SELECT
USING (true);
