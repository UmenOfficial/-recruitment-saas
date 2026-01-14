-- =====================================================
-- SUPER ADMIN MODULE MIGRATION
-- Implements: Multi-Tenancy, Global Asset Config, Security Watchtower
-- =====================================================

-- 0. Ensure Missing Tables Exist (Self-Healing)
create table if not exists questions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  content TEXT NOT NULL,
  image_url VARCHAR(500),
  options JSONB NOT NULL,
  correct_answer INTEGER NOT NULL,
  score INTEGER DEFAULT 1,
  category VARCHAR(100),
  difficulty VARCHAR(20) CHECK (difficulty IN ('EASY', 'MEDIUM', 'HARD')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

create table if not exists test_results (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  application_id UUID REFERENCES applications(id) ON DELETE CASCADE,
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  time_limit_minutes INTEGER,
  total_score INTEGER DEFAULT 0,
  max_score INTEGER,
  answers_log JSONB,
  violation_count INTEGER DEFAULT 0,
  violation_log JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

create table if not exists interview_schedules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  application_id UUID REFERENCES applications(id) ON DELETE CASCADE,
  scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
  duration_minutes INTEGER DEFAULT 60,
  meeting_link VARCHAR(500),
  meeting_id VARCHAR(255),
  status VARCHAR(20) DEFAULT 'SCHEDULED' CHECK (status IN ('SCHEDULED', 'COMPLETED', 'CANCELLED')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

create table if not exists guest_access_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  guest_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  token VARCHAR(255) UNIQUE NOT NULL,
  posting_id UUID REFERENCES postings(id),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  is_revoked BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 1. Update Companies Table (Tenant Fields)
alter table companies 
add column if not exists plan_type varchar(50) default 'FREE', -- 'FREE', 'PRO', 'ENTERPRISE'
add column if not exists service_start_date timestamp with time zone default now(),
add column if not exists service_end_date timestamp with time zone,
add column if not exists logo_url varchar(500),
add column if not exists status varchar(20) default 'ACTIVE' check (status in ('ACTIVE', 'SUSPENDED', 'EXPIRED'));

create index if not exists idx_companies_status on companies(status);

-- 2. Update Questions Table (Global vs Local)
alter table questions
add column if not exists scope varchar(20) default 'LOCAL' check (scope in ('GLOBAL', 'LOCAL')),
add column if not exists owner_company_id uuid references companies(id) on delete set null;

create index if not exists idx_questions_scope on questions(scope);
create index if not exists idx_questions_owner on questions(owner_company_id);

-- RLS for Questions need update (handled in policies mostly, but defined schema here)

-- 3. Create Security Alerts Table (Watchtower)
create table if not exists security_alerts (
  id uuid primary key default uuid_generate_v4(),
  severity varchar(20) check (severity in ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
  type varchar(50), -- 'MASS_EXPORT', 'BRUTE_FORCE', 'IMPERSONATION'
  description text,
  metadata jsonb, -- Store related IPs, User IDs
  is_resolved boolean default false,
  created_at timestamp with time zone default now()
);

create index if not exists idx_security_alerts_severity on security_alerts(severity);
create index if not exists idx_security_alerts_created_at on security_alerts(created_at);

-- 4. Create System Notices Table (Broadcasts)
create table if not exists system_notices (
  id uuid primary key default uuid_generate_v4(),
  title varchar(255) not null,
  content text,
  type varchar(20) default 'INFO' check (type in ('INFO', 'WARNING', 'CRITICAL')),
  is_active boolean default true,
  starts_at timestamp with time zone default now(),
  ends_at timestamp with time zone,
  created_by uuid references users(id),
  created_at timestamp with time zone default now()
);

-- =====================================================
-- SUPER ADMIN RLS POLICIES (Additions)
-- =====================================================

-- Security Alerts: Only Super Admin can read/write
alter table security_alerts enable row level security;

create policy "Super Admin full access security_alerts" on security_alerts
  for all using (public.get_user_role() = 'SUPER_ADMIN');

-- System Notices: Public Read, Super Admin Write
alter table system_notices enable row level security;

create policy "Public read system_notices" on system_notices
  for select using (is_active = true);

create policy "Super Admin manage system_notices" on system_notices
  for all using (public.get_user_role() = 'SUPER_ADMIN');

-- Questions Policy Update (Global vs Local)
-- Drop old policies to redefine
drop policy if exists "Questions Policy" on questions; -- Hypothetical old policy name

-- Super Admin: Full Access
create policy "Super Admin full access questions" on questions
  for all using (public.get_user_role() = 'SUPER_ADMIN');

-- Corp Admin: Read GLOBAL, Manage LOCAL (Own Company)
create policy "Corp Admin manage questions" on questions
  for all using (
    (scope = 'GLOBAL' and auth.role() = 'authenticated') -- Read Global
    OR
    (scope = 'LOCAL' and owner_company_id in (
      select company_id from company_members where user_id = auth.uid()
    ))
  );
