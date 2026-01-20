-- =====================================================
-- 커뮤니티 테이블 (posts, comments) RLS 강제 수정 (Nuclear Option)
-- UUID vs Text 타입 불일치 문제를 해결하기 위해 커뮤니티 관련 정책을 재생성합니다.
-- 또한 관리자(ADMIN, SUPER_ADMIN)가 RLS 환경에서도 게시글/댓글을 관리할 수 있도록 허용합니다.
-- =====================================================

BEGIN;

-- 1. POSTS 테이블 정책 초기화 및 재설정
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'posts') LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON posts';
    END LOOP;
END $$;

-- 정책 재설정
-- 조회: 누구나 가능 (비밀글 필터링은 애플리케이션 레벨에서 수행됨)
CREATE POLICY "Public can view posts"
ON posts FOR SELECT
TO public
USING (true);

-- 작성: 인증된 사용자 (본인 ID로만)
CREATE POLICY "Users can create posts"
ON posts FOR INSERT
TO authenticated
WITH CHECK (auth.uid()::text = user_id::text);

-- 수정: 본인 또는 관리자
CREATE POLICY "Users and Admins can update posts"
ON posts FOR UPDATE
TO authenticated
USING (
  auth.uid()::text = user_id::text
  OR
  EXISTS (SELECT 1 FROM users WHERE id::text = auth.uid()::text AND role IN ('ADMIN', 'SUPER_ADMIN'))
);

-- 삭제: 본인 또는 관리자
CREATE POLICY "Users and Admins can delete posts"
ON posts FOR DELETE
TO authenticated
USING (
  auth.uid()::text = user_id::text
  OR
  EXISTS (SELECT 1 FROM users WHERE id::text = auth.uid()::text AND role IN ('ADMIN', 'SUPER_ADMIN'))
);


-- 2. COMMENTS 테이블 정책 초기화 및 재설정
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'comments') LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON comments';
    END LOOP;
END $$;

-- 정책 재설정
-- 조회: 누구나 가능
CREATE POLICY "Public can view comments"
ON comments FOR SELECT
TO public
USING (true);

-- 작성: 인증된 사용자 (본인 ID로만)
CREATE POLICY "Users can create comments"
ON comments FOR INSERT
TO authenticated
WITH CHECK (auth.uid()::text = user_id::text);

-- 수정: 본인 또는 관리자
CREATE POLICY "Users and Admins can update comments"
ON comments FOR UPDATE
TO authenticated
USING (
  auth.uid()::text = user_id::text
  OR
  EXISTS (SELECT 1 FROM users WHERE id::text = auth.uid()::text AND role IN ('ADMIN', 'SUPER_ADMIN'))
);

-- 삭제: 본인 또는 관리자
CREATE POLICY "Users and Admins can delete comments"
ON comments FOR DELETE
TO authenticated
USING (
  auth.uid()::text = user_id::text
  OR
  EXISTS (SELECT 1 FROM users WHERE id::text = auth.uid()::text AND role IN ('ADMIN', 'SUPER_ADMIN'))
);

COMMIT;
