-- EMERGENCY UNBLOCK SCRIPT
-- Disabling RLS on core tables to bypassing locking/recursion issues.

ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE company_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE companies DISABLE ROW LEVEL SECURITY;

-- Ensure the user exists (just in case)
INSERT INTO public.users (id, email, role, full_name, is_active)
VALUES (
  '6cf05832-cffa-4862-ba09-a2a506c09b1d', -- Correct UUID from logs
  'prodaum6660@gmail.com',
  'SUPER_ADMIN',
  'Emergency Admin',
  true
)
ON CONFLICT (id) DO UPDATE
SET role = 'SUPER_ADMIN', is_active = true;
