
-- ========================================================
-- NUCLEAR FIX: INFINITE RECURSION
-- "검사 초기화 실패" 완전 제거 스크립트
-- ========================================================

-- 원인: RLS 스위치를 끄라고 했는데도 에러가 나는 경우,
-- 1) 스위치가 안 꺼졌거나 
-- 2) 정책(Policy)이 워낙 강력해서 좀비처럼 살아있을 수 있습니다.

-- 해결: 정책 자체를 아예 폭파(DROP)시키고 + 스위치도 다시 끕니다.

DO $$
BEGIN
    RAISE NOTICE '--- Starting Nuclear Cleanup ---';

    -- 1. 문제의 정책들 전멸 (DROP)
    -- 정책이 아예 없으면 무한루프도 돌 수 없습니다.
    DROP POLICY IF EXISTS "Corp Admin view own members" ON public.company_members;
    DROP POLICY IF EXISTS "Corp Admin manage members" ON public.company_members;
    DROP POLICY IF EXISTS "Super Admin full access members" ON public.company_members;
    
    -- 혹시 있을지 모를 옛날 이름들 패턴 매칭으로 삭제 시도
    -- (SQL에서는 동적 DROP이 까다로우니, 주요 이름들은 다 명시했습니다)

    RAISE NOTICE 'Policies Dropped.';

    -- 2. RLS 스위치 끄기 (확인사살)
    ALTER TABLE public.company_members DISABLE ROW LEVEL SECURITY;
    
    RAISE NOTICE 'RLS Disabled.';
    
    RAISE NOTICE 'Success: company_members is now completely open (internal use only).';
END $$;
