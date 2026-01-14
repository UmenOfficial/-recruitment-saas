-- [Fix] Missing Public Users Problem
-- 'test_results' FK 에러는 public.users 테이블에 유저 정보가 없어서 발생합니다.
-- Supabase Auth(auth.users)와 public.users 간의 동기화를 위한 트리거를 생성하고,
-- 이미 가입했지만 public.users에 누락된 유저들을 복구합니다.

-- 1. Sync Trigger Function 생성 (없다면)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, role)
  VALUES (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    'CANDIDATE' -- 기본 역할은 후보자
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Trigger 등록 (없다면)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 3. [중요] 기존 누락 유저 복구 (Backfill)
-- 현재 auth.users에는 있는데 public.users에 없는 유저를 찾아 채워넣습니다.
INSERT INTO public.users (id, email, full_name, role)
SELECT 
    id, 
    email, 
    raw_user_meta_data->>'full_name',
    'CANDIDATE'
FROM auth.users
WHERE id NOT IN (SELECT id FROM public.users)
ON CONFLICT (id) DO NOTHING;
