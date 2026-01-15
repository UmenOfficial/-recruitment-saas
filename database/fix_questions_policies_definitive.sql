
-- ========================================================
-- DEFINITIVE FIX: QUESTIONS ACCESS
-- 문항 조회 관련 모든 정책 초기화 (Reset)
-- ========================================================

-- 원인: "문항이 없습니다" 문제는 기존에 남아있던 복잡한/깨진 정책들이
-- 새로 추가한 '공개 정책'과 충돌하거나 에러를 내고 있을 가능성이 높습니다.
-- 따라서 기존 정책을 모두 지우고(DROP), 가장 확실한 '공개(Public)' 정책 하나만 남깁니다.

DO $$
BEGIN
    RAISE NOTICE '--- Resetting Policies for Questions & Tests ---';

    -- 1. [Tests] 정책 초기화
    DROP POLICY IF EXISTS "Public view active tests" ON public.tests;
    DROP POLICY IF EXISTS "Enable read access for all users" ON public.tests;
    DROP POLICY IF EXISTS "Authenticated users can view tests" ON public.tests;
    
    CREATE POLICY "Public view active tests" ON public.tests
    FOR SELECT USING (true);


    -- 2. [Test Questions] 정책 초기화 (가장 유력한 원인)
    DROP POLICY IF EXISTS "Public view test questions" ON public.test_questions;
    DROP POLICY IF EXISTS "Enable read access for all users" ON public.test_questions;
    DROP POLICY IF EXISTS "Authenticated users can view test_questions" ON public.test_questions;
    
    CREATE POLICY "Public view test questions" ON public.test_questions
    FOR SELECT USING (true);


    -- 3. [Questions] 정책 초기화
    DROP POLICY IF EXISTS "Public view questions" ON public.questions;
    DROP POLICY IF EXISTS "Enable read access for all users" ON public.questions;
    
    CREATE POLICY "Public view questions" ON public.questions
    FOR SELECT USING (true);


    -- 4. [Competencies] 역량 정보 초기화
    DROP POLICY IF EXISTS "Public view competencies" ON public.competencies;
    
    CREATE POLICY "Public view competencies" ON public.competencies
    FOR SELECT USING (true);

    RAISE NOTICE 'All question-related policies have been reset to Public Read.';
END $$;
