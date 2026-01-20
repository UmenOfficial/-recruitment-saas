-- =====================================================
-- RLS 강력 초기화 및 재설정 (Nuclear Option)
-- 기존에 설정된 모든 정책을 이름과 상관없이 강제로 삭제하고 재설정합니다.
-- =====================================================

BEGIN;

-- 1. TEST_RESULTS 테이블 정책 초기화
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'test_results') LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON test_results';
    END LOOP;
END $$;

-- 정책 재설정 (Explicit Casting)
CREATE POLICY "Users can view their own test results"
ON test_results FOR SELECT
TO authenticated
USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can insert their own test results"
ON test_results FOR INSERT
TO authenticated
WITH CHECK (auth.uid()::text = user_id::text);

CREATE POLICY "Users can update their own test results"
ON test_results FOR UPDATE
TO authenticated
USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can delete their own test results"
ON test_results FOR DELETE
TO authenticated
USING (auth.uid()::text = user_id::text);


-- 2. USERS 테이블 정책 초기화
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'users') LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON users';
    END LOOP;
END $$;

-- 정책 재설정
CREATE POLICY "Users can view own profile"
ON users FOR SELECT
TO authenticated
USING (auth.uid()::text = id::text);


-- 3. APPLICATIONS 테이블 정책 초기화
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'applications') LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON applications';
    END LOOP;
END $$;

-- 정책 재설정
CREATE POLICY "Candidate view own app"
ON applications FOR SELECT
TO authenticated
USING (auth.uid()::text = user_id::text);

CREATE POLICY "Candidate insert app"
ON applications FOR INSERT
TO authenticated
WITH CHECK (auth.uid()::text = user_id::text);

CREATE POLICY "Candidate update app"
ON applications FOR UPDATE
TO authenticated
USING (auth.uid()::text = user_id::text);


COMMIT;
