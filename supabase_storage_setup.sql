-- 1. Create Storage Buckets
-- Note: 'public' is set to true to allow easy download via public URL.
insert into storage.buckets (id, name, public)
values ('resumes', 'resumes', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('portfolios', 'portfolios', true)
on conflict (id) do nothing;

-- 2. Drop existing policies if they exist (to avoid "policy already exists" errors)
drop policy if exists "Public Upload Resumes 2" on storage.objects;
drop policy if exists "Public Read Resumes 2" on storage.objects;
drop policy if exists "Public Upload Portfolios 2" on storage.objects;
drop policy if exists "Public Read Portfolios 2" on storage.objects;

-- 3. Create Policies for Resumes
-- Allow ANYONE to upload resumes (for public application form)
create policy "Public Upload Resumes 2"
on storage.objects for insert
to public
with check ( bucket_id = 'resumes' );

-- Allow ANYONE to read resumes
create policy "Public Read Resumes 2"
on storage.objects for select
to public
using ( bucket_id = 'resumes' );

-- 4. Create Policies for Portfolios
-- Allow ANYONE to upload portfolios
create policy "Public Upload Portfolios 2"
on storage.objects for insert
to public
with check ( bucket_id = 'portfolios' );

-- Allow ANYONE to read portfolios
create policy "Public Read Portfolios 2"
on storage.objects for select
to public
using ( bucket_id = 'portfolios' );
