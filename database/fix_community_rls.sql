-- =====================================================
-- Community RLS Fix (Posts & Comments)
-- Ensures Admins have full access and Users manage their own content.
-- Includes robust Type Casting for UUID/Text comparisons.
-- SECURE UPDATE: Uses exact email matching for admin checks.
-- =====================================================

BEGIN;

-- 1. POSTS 테이블 정책 초기화
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'posts') LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON posts';
    END LOOP;
END $$;

-- Posts 정책 재설정
-- 누구나 조회 가능
CREATE POLICY "Public posts are viewable by everyone"
ON posts FOR SELECT
USING (true);

-- 유저는 본인 글 작성 가능
CREATE POLICY "Users can insert their own posts"
ON posts FOR INSERT
TO authenticated
WITH CHECK (auth.uid()::text = user_id::text);

-- 본인 또는 관리자는 수정 가능
CREATE POLICY "Users can update their own posts"
ON posts FOR UPDATE
TO authenticated
USING (
    auth.uid()::text = user_id::text
    OR
    (auth.jwt() ->> 'email' = 'Adminofficial@Umen.com') -- Secure Admin Check
);

-- 본인 또는 관리자는 삭제 가능
CREATE POLICY "Users can delete their own posts"
ON posts FOR DELETE
TO authenticated
USING (
    auth.uid()::text = user_id::text
    OR
    (auth.jwt() ->> 'email' = 'Adminofficial@Umen.com')
);


-- 2. COMMENTS 테이블 정책 초기화
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'comments') LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON comments';
    END LOOP;
END $$;

-- Comments 정책 재설정
-- 로그인한 유저만 댓글 조회 가능 (혹은 Public으로 풀고 싶으면 true)
CREATE POLICY "Comments viewable by authenticated users"
ON comments FOR SELECT
USING (auth.role() = 'authenticated');

-- 유저는 본인 댓글 작성 가능
CREATE POLICY "Users can insert their own comments"
ON comments FOR INSERT
TO authenticated
WITH CHECK (auth.uid()::text = user_id::text);

-- 본인 또는 관리자는 댓글 수정 가능
CREATE POLICY "Users can update their own comments"
ON comments FOR UPDATE
TO authenticated
USING (
    auth.uid()::text = user_id::text
    OR
    (auth.jwt() ->> 'email' = 'Adminofficial@Umen.com')
);

-- 본인 또는 관리자는 댓글 삭제 가능
CREATE POLICY "Users can delete their own comments"
ON comments FOR DELETE
TO authenticated
USING (
    auth.uid()::text = user_id::text
    OR
    (auth.jwt() ->> 'email' = 'Adminofficial@Umen.com')
);

COMMIT;
