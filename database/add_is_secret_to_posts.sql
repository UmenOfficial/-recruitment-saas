-- Add is_secret column to posts table
ALTER TABLE public.posts 
ADD COLUMN IF NOT EXISTS is_secret BOOLEAN DEFAULT FALSE;

-- Update existing QNA posts to be secret
UPDATE public.posts
SET is_secret = TRUE
WHERE category = 'QNA';

-- Add index for is_secret for faster filtering
CREATE INDEX IF NOT EXISTS idx_posts_is_secret ON public.posts(is_secret);
