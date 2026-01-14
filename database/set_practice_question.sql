-- ================================================================
-- Set the first question of each test as a practice question
-- ================================================================

-- This query updates the 'is_practice' flag to TRUE for the question with order_index = 0
-- (or order_index = 1 if 1-based, typically 0 or 1 depending on your data seeding)
-- Adjust 'order_index = 0' if your questions start at 1.

UPDATE test_questions
SET is_practice = TRUE
WHERE order_index = 0; -- Assuming 0-based index. If your first question is 1, change to 1.

-- Verify the change
SELECT * FROM test_questions WHERE is_practice = TRUE;
