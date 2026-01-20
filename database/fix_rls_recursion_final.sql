-- =====================================================================
-- FINAL RLS FIX: Recursion & Access Check
-- =====================================================================

-- 1. Helper Function: Enforce SECURITY DEFINER to break recursion loops
-- This function runs with the privileges of the creator (usually superuser),
-- bypassing RLS on the 'public.users' table to safely read the role.
CREATE OR REPLACE FUNCTION public.get_user_role() 
RETURNS text 
LANGUAGE sql 
SECURITY DEFINER 
SET search_path = public
AS $$
  SELECT role FROM public.users WHERE id = auth.uid();
$$;

-- 2. RESET Policies on 'test_results'
ALTER TABLE public.test_results ENABLE ROW LEVEL SECURITY;

-- Drop ALL existing policies to remove hidden recursive blockers
DROP POLICY IF EXISTS "Users can view own test results" ON public.test_results;
DROP POLICY IF EXISTS "Admins can view all test results" ON public.test_results;
DROP POLICY IF EXISTS "DEBUG_OPEN_ACCESS" ON public.test_results;
-- (Add other potential names if known, but generic drops help)

-- Re-create: User Access (Simple, Non-recursive)
CREATE POLICY "Users can view own test results"
ON public.test_results
FOR SELECT
USING (auth.uid() = user_id);

-- Re-create: Admin Access (Using safe function)
CREATE POLICY "Admins can view all test results"
ON public.test_results
FOR SELECT
USING (get_user_role() IN ('ADMIN', 'SUPER_ADMIN'));


-- 3. RESET Policies on 'users' (The root of recursion)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.users;

-- User Access
CREATE POLICY "Users can view own profile"
ON public.users
FOR SELECT
USING (auth.uid() = id);

-- Admin Access
CREATE POLICY "Admins can view all profiles"
ON public.users
FOR SELECT
USING (get_user_role() IN ('ADMIN', 'SUPER_ADMIN'));

-- 4. Grant Permissions (Just in case)
GRANT SELECT ON public.users TO authenticated;
GRANT SELECT ON public.test_results TO authenticated;
