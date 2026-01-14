
-- ========================================================
-- SUPABASE SECURITY ADVISOR FIX SCRIPT (PHASE 3)
-- 마지막 남은 함수 경고(Function Mutable Path)를 확실하게 처리합니다.
-- ========================================================

-- [WARNING] Function Search Path Mutable 해결
-- 이름이 달라서(복수형) 처리가 안 된 함수를 추가로 처리합니다.
DO $$
BEGIN
    -- 'seed_notification_templates' (복수형) 처리
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'seed_notification_templates') THEN
        ALTER FUNCTION public.seed_notification_templates() SET search_path = public;
    END IF;

    -- 형평성을 위해 단수형도 다시 한 번 체크
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'seed_notification_template') THEN
        ALTER FUNCTION public.seed_notification_template() SET search_path = public;
    END IF;
END $$;
