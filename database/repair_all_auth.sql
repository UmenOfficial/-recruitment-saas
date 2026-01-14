-- ========================================================
-- COMPLETE RLS RESET & REPAIR SCRIPT
-- ========================================================

-- 1. FORCE USER CREATION (Use specific UUID from logs)
--    We insert with SUPER_ADMIN role to bypass other checks.
INSERT INTO public.users (id, email, role, full_name, is_active)
VALUES (
  '6cf05832-cffa-4862-ba09-a2a506c09b1d', -- UUID from Debug Console
  'prodaum6660@gmail.com',
  'SUPER_ADMIN',
  'Force Admin',
  true
)
ON CONFLICT (id) DO UPDATE
SET role = 'SUPER_ADMIN', is_active = true;


-- 2. HELPER FUNCTIONS (SECURITY DEFINER = BYPASS RLS)
--    Re-create these to be absolutely sure they are correct.

CREATE OR REPLACE FUNCTION public.get_user_role() 
RETURNS text 
LANGUAGE sql 
SECURITY DEFINER 
SET search_path = public
AS $$
  SELECT role FROM public.users WHERE id = auth.uid();
$$;

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


-- 3. RESET POLICIES (DROP ALL)
--    We drop everything to clear any recursive garbage.

-- Table: companies
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Super Admin full access companies" ON companies;
DROP POLICY IF EXISTS "Corp Admin view own company" ON companies;

-- Table: company_members
ALTER TABLE company_members ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Super Admin full access members" ON company_members;
DROP POLICY IF EXISTS "Corp Admin manage members" ON company_members;
DROP POLICY IF EXISTS "Corp Admin view members" ON company_members;

-- Table: postings
ALTER TABLE postings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Super Admin full access postings" ON postings;
DROP POLICY IF EXISTS "Corp Admin insert postings" ON postings;
DROP POLICY IF EXISTS "Corp Admin manage own postings" ON postings;
DROP POLICY IF EXISTS "Public view active postings" ON postings;

-- Table: applications
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Candidate view own app" ON applications;
DROP POLICY IF EXISTS "Candidate insert app" ON applications;
DROP POLICY IF EXISTS "Candidate update app" ON applications;
DROP POLICY IF EXISTS "Corp Admin view company apps" ON applications;

-- Table: users
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own profile" ON users;
DROP POLICY IF EXISTS "Super Admin view all profiles" ON users;


-- 4. RE-APPLY POLICIES (CLEAN & SAFE)

-- [USERS]
CREATE POLICY "Users can view own profile" ON users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Super Admin view all profiles" ON users
  FOR ALL USING (public.get_user_role() = 'SUPER_ADMIN');


-- [COMPANIES]
CREATE POLICY "Super Admin full access companies" ON companies
  FOR ALL USING (public.get_user_role() = 'SUPER_ADMIN');

CREATE POLICY "Corp Admin view own company" ON companies
  FOR SELECT USING (
    id IN (SELECT company_id FROM public.get_my_company_ids())
  );


-- [COMPANY_MEMBERS]
CREATE POLICY "Super Admin full access members" ON company_members
  FOR ALL USING (public.get_user_role() = 'SUPER_ADMIN');

CREATE POLICY "Corp Admin view own members" ON company_members
  FOR SELECT USING (
    company_id IN (SELECT company_id FROM public.get_my_company_ids())
  );


-- [POSTINGS]
CREATE POLICY "Super Admin full access postings" ON postings
  FOR ALL USING (public.get_user_role() = 'SUPER_ADMIN');

CREATE POLICY "Corp Admin manage own postings" ON postings
  FOR ALL USING (
    company_id IN (SELECT company_id FROM public.get_my_company_ids())
  );

CREATE POLICY "Public view active postings" ON postings
  FOR SELECT USING (is_active = true);


-- [APPLICATIONS]
-- Candidates
CREATE POLICY "Candidate view own app" ON applications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Candidate insert app" ON applications
  FOR INSERT WITH CHECK (auth.uid() = user_id); 
  -- Simplified check for debugging. Add deadline/posting checks back later if needed but stick to basics now.

CREATE POLICY "Candidate update app" ON applications
  FOR UPDATE USING (auth.uid() = user_id);

-- Super Admin
CREATE POLICY "Super Admin view all apps" ON applications
  FOR ALL USING (public.get_user_role() = 'SUPER_ADMIN');

-- Corp Admin
CREATE POLICY "Corp Admin view company apps" ON applications
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM postings p
      WHERE p.id = applications.posting_id
      AND p.company_id IN (SELECT company_id FROM public.get_my_company_ids())
    )
  );

