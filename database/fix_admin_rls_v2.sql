-- =====================================================
-- FIX Ver 2: Robust RLS & Data Check
-- =====================================================

-- 1. [CRITICAL] Redefine get_user_role with SECURITY DEFINER
-- This ensures the function can read the user's role even if RLS blocks direct access.
CREATE OR REPLACE FUNCTION public.get_user_role() 
RETURNS text 
LANGUAGE sql 
SECURITY DEFINER 
SET search_path = public
AS $$
  SELECT role FROM public.users WHERE id = auth.uid();
$$;

-- 2. Drop potential conflicting policies
DROP POLICY IF EXISTS "Admin view all profiles" ON users;
DROP POLICY IF EXISTS "Super Admin view all profiles" ON users;

-- 3. Create a unified, permissible policy for all Staff (Admin + Super Admin)
CREATE POLICY "Staff view all profiles" ON users
  FOR SELECT USING (
    public.get_user_role() IN ('ADMIN', 'SUPER_ADMIN')
  );

-- 4. [VERIFICATION] Check if Name data actually exists
-- If 'full_name' column is NULL here, then the issue is missing data, not RLS.
SELECT id, email, role, full_name FROM users ORDER BY created_at DESC LIMIT 10;
