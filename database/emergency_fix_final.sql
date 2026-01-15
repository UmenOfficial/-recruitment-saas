
-- ========================================================
-- EMERGENCY FINAL FIX: UNBLOCK EVERYTHING
-- 모든 무한루프와 조회 불가 문제를 '기능 우선'으로 해결합니다.
-- ========================================================

-- 1. [Users & CompanyMembers] 무한루프 원인 차단 (RLS OFF)
-- 보안 기능 때문에 DB가 멈추는 상황이므로, 일단 끕니다.
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_members DISABLE ROW LEVEL SECURITY;


-- 2. [Questions & Tests] 문항 조회 보장 (Public View)
-- "문항이 없습니다" 해결을 위해 조회 정책을 확실하게 엽니다.

-- (기존 꼬인 정책 삭제)
DROP POLICY IF EXISTS "Public view active tests" ON public.tests;
DROP POLICY IF EXISTS "Public view test questions" ON public.test_questions;
DROP POLICY IF EXISTS "Public view questions" ON public.questions;
DROP POLICY IF EXISTS "Public view competencies" ON public.competencies;

-- (새 정책 적용 - 누구나 읽기 가능)
CREATE POLICY "Public view active tests" ON public.tests FOR SELECT USING (true);
CREATE POLICY "Public view test questions" ON public.test_questions FOR SELECT USING (true);
CREATE POLICY "Public view questions" ON public.questions FOR SELECT USING (true);
CREATE POLICY "Public view competencies" ON public.competencies FOR SELECT USING (true);


RAISE NOTICE 'Emergency Fix Applied: RLS Disabled on Users/Members + Public Read Summary.';
