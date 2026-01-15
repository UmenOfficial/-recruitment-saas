
-- ========================================================
-- LOGIN ERROR FIX: ROBUST CLEANUP (CASCADE)
-- "Foreign key constraint violation" 해결 스크립트
-- ========================================================

-- 문제: 고아 유저(orphaned user)를 지우려고 했더니,
-- 그 유저가 남긴 시험 결과(test_results) 같은 데이터가 발목을 잡고 있습니다.

-- 해결: 자식 데이터(시험 결과, 지원서 등)를 먼저 지우고 -> 부모(유저)를 지웁니다.

DO $$
BEGIN
    -- 1. 자식 데이터 정리 (Orphaned User의 데이터들)
    -- 메인 Auth에는 없는데 Public에만 있는 유저는 '삭제 대상'입니다.
    
    -- [Test Results] 시험 결과 삭제
    DELETE FROM public.test_results 
    WHERE user_id IN (SELECT id FROM public.users WHERE id NOT IN (SELECT id FROM auth.users));

    -- [Applications] 지원서 삭제
    DELETE FROM public.applications 
    WHERE user_id IN (SELECT id FROM public.users WHERE id NOT IN (SELECT id FROM auth.users));

    -- [Company Members] 멤버십 삭제
    DELETE FROM public.company_members 
    WHERE user_id IN (SELECT id FROM public.users WHERE id NOT IN (SELECT id FROM auth.users));

    -- [Evaluation Scores] 평가 기록 삭제
    DELETE FROM public.evaluation_scores 
    WHERE evaluator_id IN (SELECT id FROM public.users WHERE id NOT IN (SELECT id FROM auth.users));

    -- [Audit Logs] 로그 삭제
    DELETE FROM public.audit_logs 
    WHERE actor_id IN (SELECT id FROM public.users WHERE id NOT IN (SELECT id FROM auth.users));

    -- 2. 부모 데이터 정리 (유저 테이블)
    -- 이제 발목 잡는 데이터가 없으므로 삭제 가능합니다.
    DELETE FROM public.users 
    WHERE id NOT IN (SELECT id FROM auth.users);

    RAISE NOTICE 'Orphaned users and their data have been cleaned up.';

    -- 3. [예방] 자동 삭제 연결 (Constraint 수정)
    -- 기존 제약조건이 있다면 삭제하고, Cascade 옵션을 넣어 다시 만듭니다.
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'users_id_fkey') THEN
        ALTER TABLE public.users DROP CONSTRAINT users_id_fkey;
    END IF;

    ALTER TABLE public.users
    ADD CONSTRAINT users_id_fkey
    FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;
    
    RAISE NOTICE 'Foreign Key constraint updated to CASCADE.';
END $$;
