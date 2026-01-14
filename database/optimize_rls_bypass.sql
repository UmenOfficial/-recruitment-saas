-- Optimizing RLS Policies to use get_my_company_ids() checks
-- This prevents direct access to company_members which triggers recursion/performance issues.

-- 1. Applications Policy Update
DROP POLICY IF EXISTS "Corp Admin view company apps" ON applications;
CREATE POLICY "Corp Admin view company apps" ON applications
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM postings p
      WHERE p.id = applications.posting_id
      AND p.company_id IN (SELECT company_id FROM public.get_my_company_ids())
    )
  );

-- 2. Postings Policy Update
DROP POLICY IF EXISTS "Corp Admin manage own postings" ON postings;
DROP POLICY IF EXISTS "Corp Admin insert postings" ON postings;

CREATE POLICY "Corp Admin insert postings" ON postings
  FOR INSERT WITH CHECK (
    company_id IN (SELECT company_id FROM public.get_my_company_ids())
  );

CREATE POLICY "Corp Admin manage own postings" ON postings
  FOR ALL USING (
    company_id IN (SELECT company_id FROM public.get_my_company_ids())
  );

-- 3. Evaluation Scores Policy Update
DROP POLICY IF EXISTS "Corp Admin view all scores" ON evaluation_scores;
CREATE POLICY "Corp Admin view all scores" ON evaluation_scores
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM applications a
      JOIN postings p ON a.posting_id = p.id
      WHERE a.id = evaluation_scores.application_id
      AND p.company_id IN (SELECT company_id FROM public.get_my_company_ids())
    )
  );
