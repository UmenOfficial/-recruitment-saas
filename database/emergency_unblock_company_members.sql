
-- ========================================================
-- EMERGENCY FIX: DISABLE RLS (Infinite Recursion Unblock)
-- 무한루프가 발생하는 테이블의 보안을 잠시 끕니다.
-- ========================================================

-- 원인: company_members 테이블의 정책이 너무 복잡하게 얽혀서 
-- "검사 초기화 실패" 및 500 에러를 유발하고 있습니다.
-- 우선 기능을 살리기 위해 이 테이블만 RLS를 해제합니다.

ALTER TABLE public.company_members DISABLE ROW LEVEL SECURITY;

-- 참고: 다른 테이블(users, tests, postings 등)의 보안은 유지됩니다.
-- 추후 이 테이블의 정책만 정교하게 다시 짤 예정입니다.
