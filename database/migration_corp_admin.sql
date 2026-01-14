-- =====================================================
-- CORPORATE ADMIN MODULE MIGRATION
-- Implements: HR Workflow, Job Posting Configs, Interview Scheduling
-- =====================================================

-- 1. Update Postings Table (Configs & Operations)
alter table postings
add column if not exists process_config jsonb default '{"stages": ["DOCUMENT", "INTERVIEW", "OFFER"]}'::jsonb,
add column if not exists test_config jsonb default '{"use_aptitude": false, "use_personality": false, "webcam_required": false}'::jsonb,
add column if not exists blind_mode boolean default false,
add column if not exists highlight_keywords jsonb default '[]'::jsonb; -- Array of strings

-- 2. Create Interview Slots Table
create table if not exists interview_slots (
  id uuid primary key default uuid_generate_v4(),
  posting_id uuid references postings(id) on delete cascade,
  interviewer_id uuid references users(id) on delete set null,
  start_time timestamp with time zone not null,
  end_time timestamp with time zone not null,
  is_booked boolean default false,
  candidate_id uuid references users(id) on delete set null, -- The candidate who booked this slot
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

create index if not exists idx_interview_slots_posting on interview_slots(posting_id);
create index if not exists idx_interview_slots_time on interview_slots(start_time);
create index if not exists idx_interview_slots_booked on interview_slots(is_booked);

-- RLS for Interview Slots
alter table interview_slots enable row level security;

-- Corp Admin: Manage slots for own company postings
create policy "Corp Admin manage slots" on interview_slots
  for all using (
    exists (
      select 1 from postings p
      join company_members cm on p.company_id = cm.company_id
      where p.id = interview_slots.posting_id
      and cm.user_id = auth.uid()
    )
  );

-- Candidate: View available slots for postings they applied to (and passed document stage)
create policy "Candidate view available slots" on interview_slots
  for select using (
    is_booked = false
    -- In real app, check application status too:
    -- and exists (select 1 from applications a where a.posting_id = interview_slots.posting_id and a.user_id = auth.uid() and a.status = 'DOC_PASS')
  );

-- Candidate: Book a slot (Update)
create policy "Candidate book slot" on interview_slots
  for update using (
    is_booked = false
  )
  with check (
    is_booked = true
    and candidate_id = auth.uid()
  );
