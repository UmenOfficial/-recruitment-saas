-- [CRITICAL FIX] Test Results Constraint
-- 기존 제약조건 'uq_test_results_attempt'는 (application_id, test_id, attempt_number)로 정의되어 있습니다.
-- application_id가 NULL인 경우(일반 지원자 모드), 'NULLS NOT DISTINCT' 옵션으로 인해
-- 전역에서 단 하나의 레코드만 attempt_number=1을 가질 수 있는 심각한 버그가 있습니다.
-- 이를 (user_id, test_id, attempt_number) 조합으로 변경하여, 사용자별로 회차가 관리되도록 수정합니다.

-- 1. 기존 잘못된 제약조건 삭제
ALTER TABLE test_results
DROP CONSTRAINT IF EXISTS uq_test_results_attempt;

-- 2. 올바른 제약조건 추가 (User ID 기준)
-- user_id는 NOT NULL이 아닐 수 있으나(채용 로직에 따라), 현 로직상 user_id는 필수입니다.
-- 만약 application_id 기반도 유지해야 한다면 별도 인덱스가 필요하지만,
-- 현재 중복 키 에러 해결이 급선무이므로 user_id 기준으로 변경합니다.

CREATE UNIQUE INDEX IF NOT EXISTS idx_test_results_unique_attempt
ON test_results (user_id, test_id, attempt_number);

ALTER TABLE test_results
ADD CONSTRAINT uq_test_results_user_attempt
UNIQUE USING INDEX idx_test_results_unique_attempt;
