-- ========================================================
-- SAFE RLS RESTORATION SCRIPT
-- ========================================================

-- 1. Helper Function: Safe Role Check (Prevent Infinite Recursion)
-- 'SECURITY DEFINER' allows this function to bypass RLS, breaking the loop.
CREATE OR REPLACE FUNCTION public.get_user_role() 
RETURNS text 
LANGUAGE sql 
SECURITY DEFINER 
SET search_path = public
AS $$
  SELECT role FROM public.users WHERE id = auth.uid();
$$;

-- 2. Drop Existing Policies to start fresh
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
DROP POLICY IF EXISTS "Super Admin view all profiles" ON public.users;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.users;
DROP POLICY IF EXISTS "Service Role can do everything" ON public.users;

-- 3. Create New Policies

-- Policy A: Users can READ their own data
CREATE POLICY "Users can view own profile" ON public.users
FOR SELECT USING (
  auth.uid() = id
);

-- Policy B: Users can UPDATE their own data
CREATE POLICY "Users can update own profile" ON public.users
FOR UPDATE USING (
  auth.uid() = id
) WITH CHECK (
  auth.uid() = id
);

-- Policy C: Admins (and Super Admins) can READ ALL data
-- Uses the safe function get_user_role()
CREATE POLICY "Admins can view all profiles" ON public.users
FOR SELECT USING (
  get_user_role() IN ('ADMIN', 'SUPER_ADMIN')
);

-- Policy D: Service Role (Server-side) bypass
-- Note: 'service_role' key inherently bypasses RLS, but explicit policy can be safer
-- if we rely on role checks. However, Supabase service_role key bypasses RLS automatically.
-- We can add a policy just in case RLS is forced.

-- 4. ENABLE RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- 5. Grant permissions just in case
GRANT SELECT, UPDATE ON public.users TO authenticated;
GRANT SELECT ON public.users TO anon; -- Needed for login checks sometimes, but RLS will block if not own data
