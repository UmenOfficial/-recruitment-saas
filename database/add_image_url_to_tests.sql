-- Add image_url and is_random columns to tests table
ALTER TABLE tests
ADD COLUMN IF NOT EXISTS image_url TEXT,
ADD COLUMN IF NOT EXISTS is_random BOOLEAN DEFAULT false;
