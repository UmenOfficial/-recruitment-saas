-- =====================================================================
-- NUCLEAR OPTION: BREAK INFINITE RECURSION
-- =====================================================================

-- 1. Stub the function to IMMEDIATELY stop recursion
-- By returning a static string, we ensure NO DB query is made, breaking the loop 100%.
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS text
LANGUAGE sql
IMMUTABLE
SECURITY DEFINER
AS $$
  SELECT 'USER'; 
$$;

-- 2. Drop Every Possible Policy on 'users'
-- The recursion usually starts here.
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.users;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.users;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.users;
DROP POLICY IF EXISTS "Enable update for users based on email" ON public.users;

-- 3. Drop Every Possible Policy on 'test_results'
DROP POLICY IF EXISTS "Users can view own test results" ON public.test_results;
DROP POLICY IF EXISTS "Admins can view all test results" ON public.test_results;
DROP POLICY IF EXISTS "DEBUG_OPEN_ACCESS" ON public.test_results;

-- 4. Clean Re-Apply Basic Policies
-- Only allow "My Data" access. Safe and non-recursive.

-- Users Table
CREATE POLICY "Users can view own profile"
ON public.users
FOR SELECT
USING (auth.uid() = id);

-- Test Results Table
CREATE POLICY "Users can view own test results"
ON public.test_results
FOR SELECT
USING (auth.uid() = user_id);
