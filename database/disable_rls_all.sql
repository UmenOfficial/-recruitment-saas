-- DISABLE RLS ON ALL TABLES
-- This removes all policy checks.

ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE companies DISABLE ROW LEVEL SECURITY;
ALTER TABLE company_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE postings DISABLE ROW LEVEL SECURITY;
ALTER TABLE applications DISABLE ROW LEVEL SECURITY;
ALTER TABLE evaluation_scores DISABLE ROW LEVEL SECURITY;
ALTER TABLE questions DISABLE ROW LEVEL SECURITY;
ALTER TABLE test_results DISABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE guest_access_tokens DISABLE ROW LEVEL SECURITY;
ALTER TABLE interview_schedules DISABLE ROW LEVEL SECURITY;

-- Just to be safe, drop the problematic policies entirely so they don't zombie back if RLS is accidentally re-enabled
DROP POLICY IF EXISTS "Corp Admin view company apps" ON applications;
DROP POLICY IF EXISTS "Corp Admin view all scores" ON evaluation_scores;
