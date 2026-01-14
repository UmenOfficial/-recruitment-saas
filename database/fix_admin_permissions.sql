-- =====================================================
-- FIX: Allow ADMIN to view User Profiles
-- Problem: 'NA' in Dashboard because Admin cannot query names.
-- =====================================================

-- 1. Ensure the policy doesn't already exist (drop to be safe)
DROP POLICY IF EXISTS "Admin view all profiles" ON users;

-- 2. Create policy for 'ADMIN' role
-- Note: 'SUPER_ADMIN' is already covered by a separate policy.
-- This allows standard admins to see user names in the candidate list.
CREATE POLICY "Admin view all profiles" ON users
  FOR SELECT USING (
    public.get_user_role() = 'ADMIN'
  );
