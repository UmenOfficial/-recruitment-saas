-- [Fix] Incorrect Norm Removal
-- '협동성' 척도(Scale)의 원점수는 약 17점 내외이나, 평균이 200점인 잘못된 규준 데이터가 존재하여
-- T점수가 -39점(비정상)으로 계산되는 문제가 있습니다.
-- 해당 잘못된 규준(Mean ~200, Std ~20, Name='협동성')을 삭제하여,
-- 올바른 규준('Scale_협동성', Mean ~17)이 적용되도록 합니다.

DELETE FROM test_norms
WHERE category_name = '협동성'
AND mean_value > 100 -- Scale max score is 30, so mean > 100 is definitely wrong (it's comp mean)
AND test_id IN (
    SELECT id FROM tests WHERE title LIKE '%김현근 표준 검사%'
);

-- 확인: 삭제 후 남은 규준 확인
SELECT * FROM test_norms 
WHERE category_name LIKE '%협동성%'
AND test_id IN (
    SELECT id FROM tests WHERE title LIKE '%김현근 표준 검사%'
);
