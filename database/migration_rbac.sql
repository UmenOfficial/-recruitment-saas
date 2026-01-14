-- =====================================================
-- RBAC Migration Script (Safe Version)
-- Implements: Corporate Admin, Evaluator Isolation, Candidate Logic
-- =====================================================

-- 0. Ensure evaluation_scores exists (Fix for missing table error)
create table if not exists evaluation_scores (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  application_id UUID REFERENCES applications(id) ON DELETE CASCADE,
  evaluator_id UUID REFERENCES users(id), -- Guest or Admin
  scores JSONB NOT NULL,
  weights JSONB,
  weighted_average DECIMAL(5,2),
  comments TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 1. Create Companies Table
create table if not exists companies (
  id uuid primary key default uuid_generate_v4(),
  name varchar(255) not null,
  biz_registration_number varchar(50),
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- 2. Create Company Members Table
create table if not exists company_members (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid references companies(id) on delete cascade,
  user_id uuid references users(id) on delete cascade,
  role varchar(20) check (role in ('MASTER', 'MEMBER')),
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  unique(company_id, user_id)
);

-- 3. Update Postings (Link to Company)
alter table postings 
add column if not exists company_id uuid references companies(id);

create index if not exists idx_postings_company on postings(company_id);

-- 4. Update Users Role Constraint
-- Note: modifying check constraints requires dropping the old one
alter table users drop constraint if exists users_role_check;

alter table users 
add constraint users_role_check 
check (role in ('SUPER_ADMIN', 'CORPORATE_ADMIN', 'EXTERNAL_EVALUATOR', 'CANDIDATE', 'ADMIN', 'GUEST'));

-- 5. Update Evaluation Scores
alter table evaluation_scores 
add column if not exists status varchar(20) default 'DRAFT' check (status in ('DRAFT', 'SUBMITTED')),
add column if not exists is_recused boolean default false,
add column if not exists stage varchar(20) check (stage in ('DOCUMENT', 'INTERVIEW'));

-- 6. Update Audit Logs
alter table audit_logs
add column if not exists details jsonb;

-- =====================================================
-- RLS POLICIES
-- =====================================================

-- Helper function to get current user role
create or replace function auth.user_role() returns text as $$
  select role from public.users where id = auth.uid()
$$ language sql security definer;

-- Enable RLS
alter table companies enable row level security;
alter table company_members enable row level security;
alter table postings enable row level security; 
alter table applications enable row level security;
alter table evaluation_scores enable row level security;

-- Drop existing policies to be safe
drop policy if exists "Super Admin full access companies" on companies;
drop policy if exists "Corp Admin view own company" on companies;
drop policy if exists "Super Admin full access members" on company_members;
drop policy if exists "Corp Admin manage members" on company_members;
drop policy if exists "Candidate view own app" on applications;
drop policy if exists "Candidate insert app" on applications;
drop policy if exists "Candidate update app" on applications;
drop policy if exists "Corp Admin view company apps" on applications;
drop policy if exists "Evaluator view own scores" on evaluation_scores;
drop policy if exists "Evaluator manage draft scores" on evaluation_scores;
drop policy if exists "Corp Admin view all scores" on evaluation_scores;


-- --- COMPANIES ---
-- Super Admin: Full Access
create policy "Super Admin full access companies" on companies
  for all using (auth.user_role() = 'SUPER_ADMIN');

-- Corporate Admin: Read Own Company
create policy "Corp Admin view own company" on companies
  for select using (
    id in (select company_id from company_members where user_id = auth.uid())
  );

-- --- COMPANY MEMBERS ---
-- Super Admin: Full Access
create policy "Super Admin full access members" on company_members
  for all using (auth.user_role() = 'SUPER_ADMIN');

-- Corp Admin: Manage Own Members
create policy "Corp Admin manage members" on company_members
  for all using (
    company_id in (select company_id from company_members where user_id = auth.uid())
  );

-- --- APPLICATIONS (Candidate Window & Corp Admin) ---
-- Candidate: Select Own
create policy "Candidate view own app" on applications
  for select using (auth.uid() = user_id);

-- Candidate: Insert (Before Deadline)
create policy "Candidate insert app" on applications
  for insert with check (
    auth.uid() = user_id 
    and exists (
      select 1 from postings p 
      where p.id = posting_id 
      and p.is_active = true 
      and (p.deadline is null or now() < p.deadline)
    )
  );

-- Candidate: Update (Before Deadline)
create policy "Candidate update app" on applications
  for update using (
    auth.uid() = user_id 
    and exists (
      select 1 from postings p 
      where p.id = posting_id 
      and (p.deadline is null or now() < p.deadline)
    )
  );

-- Corp Admin: View All in Company
create policy "Corp Admin view company apps" on applications
  for select using (
    exists (
      select 1 from postings p
      join company_members cm on p.company_id = cm.company_id
      where p.id = applications.posting_id
      and cm.user_id = auth.uid()
    )
  );

-- --- EVALUATION SCORES (Evaluator Isolation) ---
-- Evaluator: View Own
create policy "Evaluator view own scores" on evaluation_scores
  for select using (evaluator_id = auth.uid());

-- Evaluator: Insert/Update (Draft Only)
create policy "Evaluator manage draft scores" on evaluation_scores
  for all using (
    evaluator_id = auth.uid() 
    and status = 'DRAFT'
    and is_recused = false
  );

-- Corp Admin: View All
create policy "Corp Admin view all scores" on evaluation_scores
  for select using (
    exists (
      select 1 from applications a
      join postings p on a.posting_id = p.id
      join company_members cm on p.company_id = cm.company_id
      where a.id = evaluation_scores.application_id
      and cm.user_id = auth.uid()
    )
  );
