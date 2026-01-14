-- Add created_at_kst column to waitlist table
ALTER TABLE waitlist ADD COLUMN IF NOT EXISTS created_at_kst TEXT;

-- Optional: Backfill for existing records (Approximation using Postgres formatting)
-- Note: '오전/오후' mapping might depend on DB locale, using simplified format for SQL backfill or relying on client for new data.
-- This query converts UTC to KST (+9) and formats it.
UPDATE waitlist 
SET created_at_kst = to_char((created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Seoul'), 'YYYY. MM. DD. AM HH12:MI:SS')
WHERE created_at_kst IS NULL;

-- Note: The API will handle the specific '오전/오후' formatting for new entries.
