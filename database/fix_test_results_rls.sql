-- [Fix] Test Results Policy
-- 본 검사 진입 시 'Unique Constraint Violation' 오류는 기존 시도(Attempt 1) 기록을 조회하지 못해
-- 새로운 Attempt 1을 생성하려다 중복 키 에러가 발생한 것입니다.
-- 따라서 본인의 test_results 데이터를 확실하게 조회(SELECT) 할 수 있어야 하며,
-- 재시작 로직(Resuming)에서 필요 시 삭제(DELETE) 권한도 필요할 수 있습니다.

-- 1. 기존 정책 삭제 (중복 방지)
DROP POLICY IF EXISTS "Users can view their own test results" ON test_results;
DROP POLICY IF EXISTS "Users can update their own test results" ON test_results;
DROP POLICY IF EXISTS "Users can insert their own test results" ON test_results;
DROP POLICY IF EXISTS "Users can delete their own test results" ON test_results;

-- 2. 정책 재생성 (ALL 권한 부여)
-- SELECT: 본인 데이터 조회 (MAX attempt_number 계산용)
CREATE POLICY "Users can view their own test results"
ON test_results FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- INSERT: 본인 데이터 생성
CREATE POLICY "Users can insert their own test results"
ON test_results FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- UPDATE: 본인 데이터 수정 (답안 저장)
CREATE POLICY "Users can update their own test results"
ON test_results FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

-- DELETE: 본인 데이터 삭제 (초기화/재시작 등)
CREATE POLICY "Users can delete their own test results"
ON test_results FOR DELETE
TO authenticated
USING (auth.uid() = user_id);
