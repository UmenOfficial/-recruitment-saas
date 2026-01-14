-- =====================================================
-- COMMUNICATION & EXCEPTION MANAGEMENT MIGRATION
-- Implements: 1:1 Q&A, Eval Exceptions, Notification Templates
-- =====================================================

-- 1. Create Inquiries Table (1:1 Q&A)
create table if not exists inquiries (
  id uuid primary key default uuid_generate_v4(),
  posting_id uuid references postings(id) on delete cascade,
  user_id uuid references users(id) on delete cascade, -- Candidate
  title varchar(255) not null,
  content text not null,
  answer text, -- Admin's reply
  answered_at timestamp with time zone,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

create index if not exists idx_inquiries_posting on inquiries(posting_id);
create index if not exists idx_inquiries_user on inquiries(user_id);

-- RLS for Inquiries
alter table inquiries enable row level security;

-- Candidate: Manage own inquiries
create policy "Candidate manage own inquiries" on inquiries
  for all using (auth.uid() = user_id);

-- Corp Admin: Manage inquiries for their company postings
create policy "Corp Admin manage inquiries" on inquiries
  for all using (
    exists (
      select 1 from postings p
      join company_members cm on p.company_id = cm.company_id
      where p.id = inquiries.posting_id
      and cm.user_id = auth.uid()
    )
  );

-- 2. Update Evaluation Scores (Exceptions)
alter table evaluation_scores
add column if not exists is_no_show boolean default false,
add column if not exists unlock_log jsonb default '[]'::jsonb; -- Log of unlocks

-- 3. Create Notification Templates Table
create table if not exists notification_templates (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid references companies(id) on delete cascade,
  trigger_type varchar(50) not null, -- ENUM handled via app logic or check constraint
  subject varchar(255) not null,
  body text not null,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  unique(company_id, trigger_type)
);

create index if not exists idx_templates_company on notification_templates(company_id);

-- RLS for Notification Templates
alter table notification_templates enable row level security;

create policy "Corp Admin manage templates" on notification_templates
  for all using (
    company_id in (select company_id from company_members where user_id = auth.uid())
  );

-- 4. Auto-Seed Templates on Company Creation
create or replace function seed_notification_templates()
returns trigger as $$
begin
  insert into notification_templates (company_id, trigger_type, subject, body) values
  (NEW.id, 'DOC_PASS', '서류 전형 합격을 축하드립니다', '안녕하세요 {{candidate_name}}님,\n\n{{company_name}}의 {{job_title}} 포지션 서류 전형에 합격하셨습니다.'),
  (NEW.id, 'DOC_FAIL', '전형 결과 안내', '안녕하세요 {{candidate_name}}님,\n\n아쉽게도 이번 전형에서는 모시지 못하게 되었습니다.'),
  (NEW.id, 'INTERVIEW_INVITE', '면접 일정 안내', '안녕하세요 {{candidate_name}}님,\n\n{{interview_date}}에 면접이 예정되어 있습니다.'),
  (NEW.id, 'FINAL_PASS', '최종 합격 안내', '축하합니다! 최종 합격하셨습니다.'),
  (NEW.id, 'FINAL_FAIL', '최종 결과 안내', '아쉽게도 불합격하셨습니다.');
  return NEW;
end;
$$ language plpgsql;

drop trigger if exists trigger_seed_templates on companies;
create trigger trigger_seed_templates
  after insert on companies
  for each row execute function seed_notification_templates();
