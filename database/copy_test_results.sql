
-- Copy results from Standard Personality Test to NIS Customizing Test
-- Source Test ID: 131ce476-3d6d-453c-a2a1-70fa5c73289d
-- Target Test ID: 77ff6903-41f4-4b1f-97e2-8f42746b10e4

INSERT INTO test_results (
    id,
    application_id,
    test_id,
    attempt_number,
    started_at,
    completed_at,
    time_limit_minutes,
    total_score,
    max_score,
    answers_log,
    violation_count,
    violation_log,
    created_at,
    user_id,
    detailed_scores
)
SELECT
    uuid_generate_v4(), -- New ID
    application_id,     -- Reuse Application ID (Same candidate)
    '77ff6903-41f4-4b1f-97e2-8f42746b10e4', -- Target Test ID
    attempt_number,
    started_at,
    completed_at,
    time_limit_minutes,
    total_score,
    max_score,
    answers_log,
    violation_count,
    violation_log,
    created_at,
    user_id,
    detailed_scores
FROM test_results
WHERE test_id = '131ce476-3d6d-453c-a2a1-70fa5c73289d' -- Source Test ID
-- Prevent duplicates if already copied
AND application_id NOT IN (
    SELECT application_id 
    FROM test_results 
    WHERE test_id = '77ff6903-41f4-4b1f-97e2-8f42746b10e4'
);
