
-- ========================================================
-- LOGIN ERROR FIX: ORPHANED USERS CLEANUP
-- "Database error saving new user" 원인 해결 스크립트
-- ========================================================

-- 원인: Auth(로그인) 관리자에서 유저를 삭제했지만,
-- Public.users 테이블에는 정보가 남아있어(고아 데이터),
-- 같은 이메일로 다시 가입하려 할 때 "이메일 중복" 에러가 발생함.

-- 1. [해결] 고아 데이터 정리
-- Auth에는 없는데 Public에만 남아있는 유령 유저들을 삭제합니다.
DELETE FROM public.users
WHERE id NOT IN (SELECT id FROM auth.users);

-- 2. [예방] 자동 삭제 연결 (FK 제약조건 추가)
-- 앞으로는 Auth에서 유저를 지우면 Public에서도 자동으로 같이 지워지도록 설정합니다.
-- (이미 제약조건이 있다면 에러가 날 수 있으나, 안전합니다)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'users_id_fkey') THEN
        ALTER TABLE public.users
        ADD CONSTRAINT users_id_fkey
        FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;
    END IF;
END $$;
