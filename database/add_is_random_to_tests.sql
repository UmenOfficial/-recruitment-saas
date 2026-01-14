-- Add is_random column to tests table
ALTER TABLE tests ADD COLUMN is_random BOOLEAN DEFAULT FALSE;
