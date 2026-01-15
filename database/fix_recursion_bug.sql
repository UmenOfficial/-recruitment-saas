
-- ========================================================
-- FIX: INFINITE RECURSION ERROR (RLS)
-- "infinite recursion detected in policy for relation" 해결
-- ========================================================

-- 원인: RLS 정책(Policy)이 사용하는 함수(get_my_company_ids)가
-- 다시 RLS를 체크하는 테이블(company_members)을 조회하면서 무한루프에 빠짐.

-- 해결: 함수에 SECURITY DEFINER 옵션을 강제로 적용하여,
-- 함수 실행 중에는 RLS 체크를 건너뛰도록(관리자 권한으로 실행) 만듭니다.

-- 1. 유저 권한 조회 함수 (재정의)
CREATE OR REPLACE FUNCTION public.get_user_role() 
RETURNS text 
LANGUAGE sql 
SECURITY DEFINER -- 핵심: RLS 우회
SET search_path = public
AS $$
  SELECT role FROM public.users WHERE id = auth.uid();
$$;

-- 2. 내 회사 목록 조회 함수 (재정의) -> 여기서 에러 발생 중이었음
CREATE OR REPLACE FUNCTION public.get_my_company_ids()
RETURNS TABLE (company_id uuid) 
LANGUAGE sql 
SECURITY DEFINER -- 핵심: RLS 우회
SET search_path = public
AS $$
  SELECT company_id 
  FROM company_members 
  WHERE user_id = auth.uid();
$$;

-- 3. (혹시 몰라) 정책을 안전하게 재생성
-- 기존 정책이 꼬였을 수 있으므로 깔끔하게 다시 잡습니다.
DROP POLICY IF EXISTS "Corp Admin view own members" ON public.company_members;

CREATE POLICY "Corp Admin view own members" ON public.company_members
  FOR SELECT USING (
    -- 함수가 SECURITY DEFINER이므로 이제 안전함
    company_id IN (SELECT company_id FROM public.get_my_company_ids())
  );
