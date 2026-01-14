
-- ========================================================
-- SUPABASE SECURITY ADVISOR FIX SCRIPT (PHASE 2)
-- 해결되지 않은 나머지 빨간색 에러(Errors)를 처리합니다.
-- ========================================================

-- 1. [CRITICAL] 추가로 발견된 테이블 RLS 활성화
-- 이 테이블들도 보안 스위치(RLS)가 꺼져 있어서 에러가 발생했습니다.
ALTER TABLE IF EXISTS public.competencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.competency_scales ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.guest_access_tokens ENABLE ROW LEVEL SECURITY; -- 민감 정보 포함 (Sensitive Columns Error 해결)
ALTER TABLE IF EXISTS public.interview_schedules ENABLE ROW LEVEL SECURITY;

-- 2. [WARNING] 함수 경로 설정 (남아있는 1개)
-- seed_notification_template 함수가 있다면 경로를 고정합니다.
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'seed_notification_template') THEN
        ALTER FUNCTION public.seed_notification_template() SET search_path = public;
    END IF;
END $$;
