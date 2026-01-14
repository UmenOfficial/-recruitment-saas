-- ================================================================
-- TARGETED UPDATE for Test ID: af901041-4aba-471a-89c5-be214172b4cf
-- ================================================================

UPDATE test_questions
SET is_practice = TRUE
WHERE id = (
  SELECT id 
  FROM test_questions 
  WHERE test_id = 'af901041-4aba-471a-89c5-be214172b4cf'
  ORDER BY order_index ASC 
  LIMIT 1
);

-- Verify
SELECT id, test_id, is_practice, order_index 
FROM test_questions 
WHERE test_id = 'af901041-4aba-471a-89c5-be214172b4cf' 
AND is_practice = TRUE;
