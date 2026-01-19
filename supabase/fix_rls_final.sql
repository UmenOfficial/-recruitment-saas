
-- RLS 정책 수정 (최종)
-- UUID/Text 타입 불일치 문제를 해결하기 위해 명시적 캐스팅을 사용합니다.

ALTER TABLE public.test_results ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own results" ON public.test_results;
DROP POLICY IF EXISTS "Users can view their own test results" ON public.test_results;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.test_results;

CREATE POLICY "Users can view own results"
ON public.test_results
FOR SELECT
TO authenticated
USING (
    -- user_id가 UUID 타입이든 TEXT 타입이든 상관없이 비교 가능하게 함
    auth.uid()::text = user_id::text
);
