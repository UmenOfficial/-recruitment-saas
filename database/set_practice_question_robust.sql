-- ================================================================
-- Robustly set the FIRST question as a practice question
-- ================================================================

-- This query finds the question with the lowest order_index (the first one)
-- and marks it as a practice question.
UPDATE test_questions
SET is_practice = TRUE
WHERE id IN (
  SELECT id 
  FROM test_questions 
  ORDER BY order_index ASC 
  LIMIT 1
);

-- Verify: Should result in 1 row (or more if multiple tests)
SELECT * FROM test_questions WHERE is_practice = TRUE;
