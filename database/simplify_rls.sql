-- =====================================================================
-- EMERGENCY SIMPLIFICATION: BREAK RECURSION
-- =====================================================================

-- The 'get_user_role()' function calling 'users' table is causing recursion.
-- Since Admin Dashboard uses Service Role (Bypass RLS), we don't strictly need
-- the "Admin View All" policy for Client-Side queries right now.
-- We will reduce policies to the absolute minimum: "Owner Access Only".

-- 1. Simplify 'test_results'
ALTER TABLE public.test_results ENABLE ROW LEVEL SECURITY;

-- Remove recursively triggering policies
DROP POLICY IF EXISTS "Admins can view all test results" ON public.test_results;
DROP POLICY IF EXISTS "DEBUG_OPEN_ACCESS" ON public.test_results;

-- Ensure Owner Access exists
DROP POLICY IF EXISTS "Users can view own test results" ON public.test_results;
CREATE POLICY "Users can view own test results"
ON public.test_results
FOR SELECT
USING (auth.uid() = user_id);


-- 2. Simplify 'users'
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Remove recursively triggering policies
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.users;

-- Ensure Owner Access exists
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
CREATE POLICY "Users can view own profile"
ON public.users
FOR SELECT
USING (auth.uid() = id);

-- 3. Cleanup
-- We leave get_user_role function alone, but we stop using it in policies.
