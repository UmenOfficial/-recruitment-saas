-- 1. Insert Guest Access Token for Split View Demo
INSERT INTO public.guest_access_tokens (token, expires_at, is_revoked, guest_user_id)
VALUES 
  ('demo-split-view-token', NOW() + INTERVAL '1 day', false, NULL)
ON CONFLICT (token) DO NOTHING;

-- 2. Insert Mock Questions for Test Timer Demo (if not exist)
INSERT INTO public.questions (category, content, options, correct_answer, score, difficulty)
VALUES
  ('React', 'React의 useEffect 의존성 배열이 빈 배열([])일 때 언제 실행되나요?', '["컴포넌트가 마운트될 때 한 번만", "매 렌더링마다", "컴포넌트가 언마운트될 때만", "state가 변경될 때마다"]'::jsonb, 0, 1, 'EASY'),
  ('CSS', 'Flexbox에서 주축(Main Axis) 정렬을 담당하는 속성은?', '["align-items", "justify-content", "flex-direction", "align-content"]'::jsonb, 1, 1, 'MEDIUM')
ON CONFLICT DO NOTHING;

-- 3. Ensure a Test Result exists for "demo@example.com" (User ID lookup needed, so we might skip this in SQL and rely on app logic to create it)
-- Since we can't easily know the UUID of a user from here without querying, we'll rely on the user to Login or Sign Up.
-- But we can insert a public dummy user if RLS allows, or just let the user Sign Up.
