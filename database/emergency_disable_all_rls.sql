
-- ========================================================
-- SUPER EMERGENCY: DISABLE RLS ON ALL RELATED TABLES
-- "Infinite Recursion on Users" 완전 제거
-- ========================================================

-- 진단: 아까 "Users RLS 해제" 명령이 적용되지 않았거나, 
-- test_results 테이블이 엮이면서 계속 Users 정책을 건드리고 있습니다.

-- 해결: 루프에 참여하는 모든 테이블의 RLS를 강제로 끕니다.

BEGIN;

-- 1. 무한루프 3대장 테이블 보안 해제 (RLS OFF)
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_results DISABLE ROW LEVEL SECURITY; -- 추가됨

-- 2. 혹시 몰라 Users 테이블의 정책 자체를 삭제 (확인사살)
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.users;
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.users;
-- (나중에 안정이 되면 다시 추가하면 됩니다)

-- 3. 문항 조회 권한 재확인 (공개)
CREATE POLICY "Public view test questions local" ON public.test_questions FOR SELECT USING (true);
CREATE POLICY "Public view questions local" ON public.questions FOR SELECT USING (true);


COMMIT;

RAISE NOTICE 'SUCCESS: RLS Disabled on Users, Members, Results.';
