-- Fix missing user_id on test_results
-- This script updates test_results rows where user_id is NULL by copying user_id from the linked application.

UPDATE test_results tr
SET user_id = a.user_id
FROM applications a
WHERE tr.application_id = a.id
  AND tr.user_id IS NULL;

-- Ensure consistency (optional: update even if not null but mismatch? usually safe to assume app user is correct owner)
-- UPDATE test_results tr
-- SET user_id = a.user_id
-- FROM applications a
-- WHERE tr.application_id = a.id
--   AND tr.user_id IS DISTINCT FROM a.user_id;
