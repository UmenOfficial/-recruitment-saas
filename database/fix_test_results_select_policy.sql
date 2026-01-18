-- 1. Enable RLS (Already on, but ensuring)
ALTER TABLE public.test_results ENABLE ROW LEVEL SECURITY;

-- 2. Drop potential duplicate policy
DROP POLICY IF EXISTS "Users can view own test results" ON public.test_results;

-- 3. Create Policy
CREATE POLICY "Users can view own test results"
ON public.test_results
FOR SELECT
USING (auth.uid() = user_id);
