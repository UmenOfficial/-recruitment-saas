-- [Fix] Cleanup Legacy Norms
-- 'Scale_' 및 'Comp_' 접두어가 붙은 올바른 규준 데이터가 존재하므로,
-- 접두어가 없는 구버전(Plain) 규준 데이터를 삭제하여 이름 충돌 및 점수 계산 오류를 방지합니다.

-- 1. 'Scale_' 접두어 데이터가 존재하는 항목의 Plain 버전 삭제
DELETE FROM test_norms
WHERE category_name NOT LIKE 'Scale_%' 
AND category_name NOT LIKE 'Comp_%'
AND category_name <> 'TOTAL'
AND CONCAT('Scale_', category_name) IN (
    SELECT category_name FROM test_norms tn2 WHERE tn2.test_id = test_norms.test_id
);

-- 2. 'Comp_' 접두어 데이터가 존재하는 항목의 Plain 버전 삭제
DELETE FROM test_norms
WHERE category_name NOT LIKE 'Scale_%' 
AND category_name NOT LIKE 'Comp_%'
AND category_name <> 'TOTAL'
AND CONCAT('Comp_', category_name) IN (
    SELECT category_name FROM test_norms tn2 WHERE tn2.test_id = test_norms.test_id
);

-- 3. 확인: 삭제 후 남은 Plain 규준 조회 (0건이어야 이상적)
SELECT category_name, mean_value FROM test_norms 
WHERE category_name NOT LIKE 'Scale_%' 
AND category_name NOT LIKE 'Comp_%'
AND category_name <> 'TOTAL'
AND test_id IN (SELECT id FROM tests WHERE title LIKE '%김현근 표준 검사%');
