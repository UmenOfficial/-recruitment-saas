
-- ========================================================
-- DEBUG & FIX: INFINITE RECURSION (Retry with Explicit Drops)
-- 정책 중복 에러 방지를 위해 명시적으로 DROP을 먼저 수행합니다.
-- ========================================================

DO $$
BEGIN
    RAISE NOTICE '--- Cleaning up Functions & Policies ---';
    
    -- 1. 함수 삭제 (CASCADE로 연관된 것들 1차 삭제)
    DROP FUNCTION IF EXISTS public.get_my_company_ids() CASCADE;
    DROP FUNCTION IF EXISTS public.get_user_role() CASCADE;

    -- 2. 남아있을 수 있는 정책들도 명시적으로 삭제 (안전장치)
    DROP POLICY IF EXISTS "Super Admin full access members" ON public.company_members;
    DROP POLICY IF EXISTS "Corp Admin view own members" ON public.company_members;
    DROP POLICY IF EXISTS "Corp Admin manage members" ON public.company_members;
    DROP POLICY IF EXISTS "Corp Admin view members" ON public.company_members; -- 혹시 옛날 이름이 있다면

    RAISE NOTICE 'Cleanup complete. Recreating...';

    -- 3. 함수 재정의 (Security Definer 필수)
    EXECUTE '
    CREATE OR REPLACE FUNCTION public.get_user_role() 
    RETURNS text 
    LANGUAGE sql 
    SECURITY DEFINER 
    SET search_path = public
    AS $f$
      SELECT role FROM public.users WHERE id = auth.uid();
    $f$;';
    
    EXECUTE '
    CREATE OR REPLACE FUNCTION public.get_my_company_ids()
    RETURNS TABLE (company_id uuid) 
    LANGUAGE sql 
    SECURITY DEFINER 
    SET search_path = public
    AS $f$
      SELECT company_id 
      FROM company_members 
      WHERE user_id = auth.uid();
    $f$;';

    -- 4. 정책 재생성
    CREATE POLICY "Super Admin full access members" ON public.company_members
      FOR ALL USING (public.get_user_role() = 'SUPER_ADMIN');

    CREATE POLICY "Corp Admin view own members" ON public.company_members
      FOR SELECT USING (
        company_id IN (SELECT company_id FROM public.get_my_company_ids())
      );
      
    CREATE POLICY "Corp Admin manage members" ON public.company_members
      FOR ALL USING (
        company_id IN (SELECT company_id FROM public.get_my_company_ids())
      );

    RAISE NOTICE 'Success! Infinite recursion should be gone.';
    
END $$;
