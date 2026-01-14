-- 1. Create Helper Function to Break Recursion
-- This function accesses company_members with elevated privileges (SECURITY DEFINER)
-- to avoid triggering RLS policies recursively.
CREATE OR REPLACE FUNCTION public.get_my_company_ids()
RETURNS TABLE (company_id uuid) 
LANGUAGE sql 
SECURITY DEFINER 
SET search_path = public
AS $$
  SELECT company_id 
  FROM company_members 
  WHERE user_id = auth.uid();
$$;

-- 2. Update RLS Policies for company_members using the helper function
ALTER TABLE company_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Corp Admin manage members" ON company_members;

-- Allow users to view members of companies they belong to (without recursion)
CREATE POLICY "Corp Admin view members" ON company_members
  FOR SELECT USING (
    company_id IN (SELECT company_id FROM public.get_my_company_ids())
  );

-- Allow users to manage members of companies they belong to (Role check should ideally be added here too, but start with company check)
CREATE POLICY "Corp Admin manage members" ON company_members
  FOR ALL USING (
    company_id IN (SELECT company_id FROM public.get_my_company_ids())
  );

-- 3. Ensure User Exists in public.users (Sync Logic)
-- Check if user exists, if not insert (Best effort for manual fix)
INSERT INTO public.users (id, email, role, full_name)
SELECT id, email, 'SUPER_ADMIN', 'Super Admin User'
FROM auth.users
WHERE email = 'prodaum6660@gmail.com'
ON CONFLICT (id) DO UPDATE 
SET role = 'SUPER_ADMIN'; -- Force ensure Super Admin role

-- 4. Re-apply User Visibility Policy just in case
DROP POLICY IF EXISTS "Users can view own profile" ON users;
CREATE POLICY "Users can view own profile" ON users
  FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Super Admin view all profiles" ON users;
CREATE POLICY "Super Admin view all profiles" ON users
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role = 'SUPER_ADMIN'
    )
  );
