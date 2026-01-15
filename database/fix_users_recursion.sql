
-- ========================================================
-- RECURSION FIX: USERS TABLE
-- "relation 'users' infinite recursion" 해결 스크립트
-- ========================================================

-- 원인: 'get_user_role()' 함수가 SECURITY DEFINER(보안 우회) 설정이 안 되어 있어서,
-- users 테이블을 조회할 때 무한히 검문을 반복하고 있습니다.
-- 이전 스크립트가 정책 충돌로 실패하면서 이 설정이 적용되지 않았습니다.

-- 해결: 정책(Policy)은 건드리지 않고, 오직 "함수"만 안전하게 수정합니다.

-- 1. get_user_role 함수 보안 등급 상향
CREATE OR REPLACE FUNCTION public.get_user_role() 
RETURNS text 
LANGUAGE sql 
SECURITY DEFINER -- 핵심: 무한루프 방지
SET search_path = public
AS $$
  SELECT role FROM public.users WHERE id = auth.uid();
$$;

-- 2. get_my_company_ids 함수도 혹시 모르니 확인사살
CREATE OR REPLACE FUNCTION public.get_my_company_ids()
RETURNS TABLE (company_id uuid) 
LANGUAGE sql 
SECURITY DEFINER 
SET search_path = public
AS $$
  SELECT company_id 
  FROM company_members 
  WHERE user_id = auth.uid();
$$;

-- 3. Users 테이블 RLS가 켜져있는지 확인 (켜져 있어야 정상)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- 여기까지 실행되면 무한루프가 끊겨야 합니다.
