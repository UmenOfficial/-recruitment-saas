
-- ========================================================
-- FIX: INCORRECT QUESTION OPTIONS
-- "선택지가 이상해" (이상한 텍스트 또는 빈 값) 해결 스크립트
-- ========================================================

-- 원인: DB에 저장된 문항 데이터의 '선택지(options)' 컬럼에 
-- ["","","","",""] 처럼 빈 값이나 이상한 값이 잘못 들어가 있습니다.

-- 해결: 표준 인성검사의 모든 문항 선택지를 NULL로 초기화합니다.
-- (NULL이면 프론트엔드가 자동으로 "전혀 그렇지 않다 ~ 매우 그렇다" 표준 척도를 보여줍니다)

DO $$
DECLARE
    target_test_id uuid;
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

    -- 2. 해당 시험에 연결된 모든 문항의 options를 NULL로 초기화
    -- (UPDATE questions via JOIN test_questions)
    
    UPDATE public.questions q
    SET options = NULL
    FROM public.test_questions tq
    WHERE q.id = tq.question_id
      AND tq.test_id = target_test_id;

    RAISE NOTICE 'Successfully reset options to NULL for all questions in this test.';
END $$;
