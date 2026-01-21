-- Create table for storing Personality Test Deep Dive Reports
create table if not exists personality_test_reports (
  id uuid default gen_random_uuid() primary key,
  test_result_id uuid references test_results(id) not null,
  report jsonb not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(test_result_id)
);

-- Add RLS policies
alter table personality_test_reports enable row level security;

-- Policy: Users can view their own reports (linked via test_result -> application -> user_id)
-- Note: This requires joining multiple tables which can be expensive, or simplified if user_id is denormalized.
-- For now, allow reading if the associated test_result is accessible.
create policy "Users can view their own reports"
  on personality_test_reports for select
  using (
    exists (
      select 1 from test_results tr
      join applications app on tr.application_id = app.id
      where tr.id = personality_test_reports.test_result_id
      and app.user_id = auth.uid()
    )
  );

-- Policy: Service Role can do everything
create policy "Service Role full access"
  on personality_test_reports
  using ( auth.role() = 'service_role' );
