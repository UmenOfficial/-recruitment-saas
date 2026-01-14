-- Add is_reverse_scored column to questions table
ALTER TABLE questions 
ADD COLUMN is_reverse_scored BOOLEAN DEFAULT FALSE;

-- Comment on column
COMMENT ON COLUMN questions.is_reverse_scored IS 'Indicates if the question requires reverse scoring (e.g. 1->7, 7->1)';
