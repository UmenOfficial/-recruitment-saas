-- Allow users to read their own profile (essential for role check)
create policy "Users can view own profile" on users
  for select using (auth.uid() = id);

-- Allow Super Admin to view all profiles
create policy "Super Admin view all profiles" on users
  for select using (
    exists (
      select 1 from users where id = auth.uid() and role = 'SUPER_ADMIN'
    )
  );
-- Note: Limit infinite recursion by not using the helper function inside the policy that defines the helper function's source access ideally, 
-- or ensure the helper function is SECURITY DEFINER which it is. 
-- But wait, standard user role check is `auth.uid() = id` which is safe.
