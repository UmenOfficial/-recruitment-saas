-- =====================================================
-- RLS 전수 검사 및 수정: 모든 사용자 소유 테이블에 대한 안전한 정책 적용
-- UUID vs Text 타입 불일치 방지를 위해 explicit casting (auth.uid()::text = col::text) 사용
-- =====================================================

BEGIN;

-- 1. USERS 테이블 (사용자 프로필)
-- 기존 정책 삭제 (중복 및 충돌 방지)
DROP POLICY IF EXISTS "Users can view own profile" ON users;
DROP POLICY IF EXISTS "Users can view their own profile" ON users;

-- 안전한 정책 재성성
CREATE POLICY "Users can view own profile"
ON users FOR SELECT
TO authenticated
USING (auth.uid()::text = id::text);


-- 2. TEST_RESULTS 테이블 (인성검사 결과)
-- 대시보드 및 검사 초기화 시 본인 데이터 접근 보장
DROP POLICY IF EXISTS "Users can view their own test results" ON test_results;
DROP POLICY IF EXISTS "Users can view own test results" ON test_results;
DROP POLICY IF EXISTS "Users can update their own test results" ON test_results;
DROP POLICY IF EXISTS "Users can insert their own test results" ON test_results;
DROP POLICY IF EXISTS "Users can delete their own test results" ON test_results;

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


-- 3. APPLICATIONS 테이블 (지원서)
-- 지원자가 본인의 지원 내역을 조회/수정할 수 있도록 보장
DROP POLICY IF EXISTS "Candidate view own app" ON applications;
DROP POLICY IF EXISTS "Candidate insert app" ON applications;
DROP POLICY IF EXISTS "Candidate update app" ON applications;

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
