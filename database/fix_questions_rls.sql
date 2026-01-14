-- [Fix] Questions Policy for Candidates
-- 일반 지원자(CANDIDATE)가 시험을 치르기 위해서는 questions 테이블을 조회할 수 있어야 합니다.
-- 기존 정책이 관리자만 허용하고 있다면, SELECT에 한해 모든 인증된 사용자에게 허용합니다.

-- 1. questions 테이블 정책 추가/수정
DROP POLICY IF EXISTS "Enable read access for all users" ON questions;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON questions;

CREATE POLICY "Enable read access for authenticated users"
ON questions FOR SELECT
TO authenticated
USING (true);

-- 2. test_questions 테이블 정책 확인 (이미 있다면 생략되지만 명시적으로 확인)
DROP POLICY IF EXISTS "Enable read access for all users" ON test_questions;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON test_questions;

CREATE POLICY "Enable read access for authenticated users"
ON test_questions FOR SELECT
TO authenticated
USING (true);

-- 3. tests 테이블 정책 (시험 정보 조회)
-- tests 테이블도 조회가 되어야 initializeTest의 Step A가 성공합니다.
-- 보통 tests는 공개되거나 할당된 사람만 보지만, 여기서는 authenticated에 엽니다.
CREATE POLICY "Enable read access for authenticated users"
ON tests FOR SELECT
TO authenticated
USING (true);
