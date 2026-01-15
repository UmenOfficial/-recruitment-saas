
-- ========================================================
-- FIX V2: INCORRECT QUESTION OPTIONS (NOT NULL Constraint)
-- "Null Value Violates Constraint" 해결 스크립트
-- ========================================================

-- 원인: Questions 테이블의 options 컬럼이 'NOT NULL'로 설정되어 있어서 NULL로 초기화가 불가능했습니다.
-- 해결: NULL 대신, 우리가 원하는 '표준 선택지' 값을 직접 집어넣습니다.

DO $$
DECLARE
    target_test_id uuid;
    -- 표준 선택지 JSON 정의
    standard_options jsonb := '["전혀 그렇지 않다", "그렇지 않다", "보통이다", "그렇다", "매우 그렇다"]'::jsonb;
BEGIN
    -- 1. 표준 인성검사 ID 찾기
    SELECT id INTO target_test_id 
    FROM public.tests 
    WHERE title LIKE '%표준 인성%' 
    LIMIT 1;

    IF target_test_id IS NULL THEN
        RAISE EXCEPTION 'Standard Personality Test not found';
    END IF;

    RAISE NOTICE 'Found Test ID: %', target_test_id;

    -- 2. 해당 시험 문항들의 options를 '표준 선택지' 값으로 덮어쓰기
    UPDATE public.questions q
    SET options = standard_options
    FROM public.test_questions tq
    WHERE q.id = tq.question_id
      AND tq.test_id = target_test_id;

    RAISE NOTICE 'Successfully updated options to Standard Defaults for all questions.';
END $$;
