-- Allow Admins and Super Admins to view ALL test results
-- Check if policy exists, if not create.

-- Policy for enabling Select for Admins
DROP POLICY IF EXISTS "Enable read access for admins" ON test_results;

CREATE POLICY "Enable read access for admins"
ON test_results
FOR SELECT
TO authenticated
USING (
  auth.uid() IN (
    SELECT id FROM users WHERE role IN ('ADMIN', 'SUPER_ADMIN')
  )
);

-- Also ensure Admins can see ALL users (public.users)
-- (Usually public.users is visible, but just in case)
DROP POLICY IF EXISTS "Enable read access for admins" ON users;
CREATE POLICY "Enable read access for admins"
ON users
FOR SELECT
TO authenticated
USING (
  auth.uid() IN (
    SELECT id FROM users WHERE role IN ('ADMIN', 'SUPER_ADMIN')
  )
  OR
  auth.uid() = id -- Users can see themselves
);

-- Note: user's role logic might need to be robust. 
-- Best is to have an `is_admin()` function but subquery is fine for now.
