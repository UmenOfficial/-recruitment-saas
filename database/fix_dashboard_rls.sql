-- RLS 이슈 해결: UUID 비교 시 explicit casting 추가
-- Dashboard에서 test_results가 보이지 않는 문제 해결 (UUID vs String mismatch 방지)

BEGIN;

-- 1. test_results 정책 재설정
DROP POLICY IF EXISTS "Users can view their own test results" ON test_results;
DROP POLICY IF EXISTS "Users can view own test results" ON test_results;
DROP POLICY IF EXISTS "Users can update their own test results" ON test_results;
DROP POLICY IF EXISTS "Users can insert their own test results" ON test_results;
DROP POLICY IF EXISTS "Users can delete their own test results" ON test_results;

-- SELECT: UUID casting 추가
CREATE POLICY "Users can view their own test results"
ON test_results FOR SELECT
TO authenticated
USING (auth.uid()::text = user_id::text);

-- INSERT
CREATE POLICY "Users can insert their own test results"
ON test_results FOR INSERT
TO authenticated
WITH CHECK (auth.uid()::text = user_id::text);

-- UPDATE
CREATE POLICY "Users can update their own test results"
ON test_results FOR UPDATE
TO authenticated
USING (auth.uid()::text = user_id::text);

-- DELETE
CREATE POLICY "Users can delete their own test results"
ON test_results FOR DELETE
TO authenticated
USING (auth.uid()::text = user_id::text);

COMMIT;
