-- =====================================================
-- FULL DATABASE INITIALIZATION & RBAC SETUP
-- Run this script to completely set up the database schema
-- =====================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- 1. Create Users Table
create table if not exists users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  encrypted_password VARCHAR(255),
  role VARCHAR(20) NOT NULL CHECK (role IN ('SUPER_ADMIN', 'CORPORATE_ADMIN', 'EXTERNAL_EVALUATOR', 'CANDIDATE', 'ADMIN', 'GUEST')),
  full_name VARCHAR(100),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create Companies Table (RBAC)
create table if not exists companies (
  id uuid primary key default uuid_generate_v4(),
  name varchar(255) not null,
  biz_registration_number varchar(50),
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- 3. Create Company Members Table (RBAC)
create table if not exists company_members (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid references companies(id) on delete cascade,
  user_id uuid references users(id) on delete cascade,
  role varchar(20) check (role in ('MASTER', 'MEMBER')),
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  unique(company_id, user_id)
);

-- 4. Create Job Postings Table
create table if not exists postings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  site_config JSONB,
  is_active BOOLEAN DEFAULT TRUE,
  deadline TIMESTAMP WITH TIME ZONE,
  created_by UUID REFERENCES users(id),
  company_id UUID REFERENCES companies(id), -- Linked to company
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ensure company_id exists even if table already existed without it
alter table postings add column if not exists company_id UUID REFERENCES companies(id);

-- 5. Create Applications Table
create table if not exists applications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  posting_id UUID REFERENCES postings(id) ON DELETE CASCADE,
  status VARCHAR(30) NOT NULL DEFAULT 'APPLIED' 
    CHECK (status IN ('APPLIED', 'TEST_PENDING', 'TEST_COMPLETED', 'INTERVIEW', 'PASS', 'FAIL', 'WITHDRAWN')),
  
  pii_phone_encrypted TEXT,
  pii_address_encrypted TEXT,
  pii_resident_id_encrypted TEXT,
  pii_email_encrypted TEXT,

  name VARCHAR(100),
  dob DATE,
  gender VARCHAR(10),
  photo_url VARCHAR(500),
  resume_url VARCHAR(500),
  portfolio_url VARCHAR(500),
  custom_answers JSONB,
  
  application_data JSONB DEFAULT '{}'::jsonb,
  
  data_retention_days INTEGER DEFAULT 180,
  consent_given_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  blind_mode_enabled BOOLEAN DEFAULT TRUE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Create Audit Logs Table
create table if not exists audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  actor_id UUID REFERENCES users(id),
  target_application_id UUID REFERENCES applications(id),
  action VARCHAR(50) NOT NULL,
  ip_address VARCHAR(45),
  user_agent TEXT,
  details JSONB, -- Added for RBAC
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. Create Evaluation Scores Table
create table if not exists evaluation_scores (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  application_id UUID REFERENCES applications(id) ON DELETE CASCADE,
  evaluator_id UUID REFERENCES users(id),
  scores JSONB NOT NULL,
  weights JSONB,
  weighted_average DECIMAL(5,2),
  comments TEXT,
  
  -- RBAC Fields
  status varchar(20) default 'DRAFT' check (status in ('DRAFT', 'SUBMITTED')),
  is_recused boolean default false,
  stage varchar(20) check (stage in ('DOCUMENT', 'INTERVIEW')),
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- RLS POLICIES (Merged)
-- =====================================================

-- Helper function (Public Schema)
create or replace function public.get_user_role() returns text as $$
  select role from public.users where id = auth.uid()
$$ language sql security definer;

-- Enable RLS
alter table companies enable row level security;
alter table company_members enable row level security;
alter table postings enable row level security;
alter table applications enable row level security;
alter table evaluation_scores enable row level security;

-- Drop existing policies to Avoid Duplicates
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

-- Policies
create policy "Super Admin full access companies" on companies
  for all using (public.get_user_role() = 'SUPER_ADMIN');

create policy "Corp Admin view own company" on companies
  for select using (
    id in (select company_id from company_members where user_id = auth.uid())
  );

create policy "Super Admin full access members" on company_members
  for all using (public.get_user_role() = 'SUPER_ADMIN');

create policy "Corp Admin manage members" on company_members
  for all using (
    company_id in (select company_id from company_members where user_id = auth.uid())
  );

create policy "Candidate view own app" on applications
  for select using (auth.uid() = user_id);

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

create policy "Candidate update app" on applications
  for update using (
    auth.uid() = user_id 
    and exists (
      select 1 from postings p 
      where p.id = posting_id 
      and (p.deadline is null or now() < p.deadline)
    )
  );

create policy "Corp Admin view company apps" on applications
  for select using (
    exists (
      select 1 from postings p
      join company_members cm on p.company_id = cm.company_id
      where p.id = applications.posting_id
      and cm.user_id = auth.uid()
    )
  );

create policy "Evaluator view own scores" on evaluation_scores
  for select using (evaluator_id = auth.uid());

create policy "Evaluator manage draft scores" on evaluation_scores
  for all using (
    evaluator_id = auth.uid() 
    and status = 'DRAFT'
    and is_recused = false
  );

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
