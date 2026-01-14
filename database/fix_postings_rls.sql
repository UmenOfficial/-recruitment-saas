-- 1. Enable RLS on users table (it was missing in migration_rbac.sql)
alter table users enable row level security;

-- 2. Allow Super Admin to create postings (if not already allowed by logic, though usually done via app logic)
-- Actually Postings RLS was enabled but no policy for INSERT was defined in the files I saw?
-- Let's check postings policies.

-- Super Admin full access to postings
create policy "Super Admin full access postings" on postings
  for all using (
    exists (select 1 from users where id = auth.uid() and role = 'SUPER_ADMIN')
  );

-- Corp Admin can insert postings linked to their company
create policy "Corp Admin insert postings" on postings
  for insert with check (
    exists (
      select 1 from company_members cm
      where cm.user_id = auth.uid()
      and cm.company_id = company_id
    )
  );

-- Corp Admin view/update own company postings
create policy "Corp Admin manage own postings" on postings
  for all using (
    exists (
      select 1 from company_members cm
      where cm.user_id = auth.uid()
      and cm.company_id = company_id
    )
  );

-- Public/Candidates view active postings
create policy "Public view active postings" on postings
  for select using (is_active = true);
