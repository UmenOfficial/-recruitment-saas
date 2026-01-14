-- ================================================================
-- Set the FIRST question of EVERY test as a practice question
-- ================================================================

UPDATE test_questions
SET is_practice = TRUE
WHERE id IN (
  SELECT id
  FROM (
    SELECT id, ROW_NUMBER() OVER (PARTITION BY test_id ORDER BY order_index ASC) as rn
    FROM test_questions
  ) sub
  WHERE sub.rn = 1
);

-- Verify: Check count of practice questions (should be equal to number of tests)
SELECT count(*) as practice_count FROM test_questions WHERE is_practice = TRUE;
