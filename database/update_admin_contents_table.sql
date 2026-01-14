-- Add body column for article content
ALTER TABLE public.admin_contents 
ADD COLUMN IF NOT EXISTS body TEXT;

-- Make content_url optional (not needed for directly written articles)
ALTER TABLE public.admin_contents 
ALTER COLUMN content_url DROP NOT NULL;

-- Create bucket for article content images
INSERT INTO storage.buckets (id, name, public)
VALUES ('admin_content_images', 'admin_content_images', true)
ON CONFLICT (id) DO NOTHING;

-- Drop existing policies to avoid creating duplicates (Error 42710)
DROP POLICY IF EXISTS "Give public access to admin_content_images" ON storage.objects;
DROP POLICY IF EXISTS "Enable upload access for authenticated users (content images)" ON storage.objects;
DROP POLICY IF EXISTS "Enable update access for authenticated users (content images)" ON storage.objects;
DROP POLICY IF EXISTS "Enable delete access for authenticated users (content images)" ON storage.objects;

-- Storage policies for article content images
CREATE POLICY "Give public access to admin_content_images" ON storage.objects
    FOR SELECT
    USING (bucket_id = 'admin_content_images');

CREATE POLICY "Enable upload access for authenticated users (content images)" ON storage.objects
    FOR INSERT
    WITH CHECK (bucket_id = 'admin_content_images' AND auth.role() = 'authenticated');

CREATE POLICY "Enable update access for authenticated users (content images)" ON storage.objects
    FOR UPDATE
    USING (bucket_id = 'admin_content_images' AND auth.role() = 'authenticated');

CREATE POLICY "Enable delete access for authenticated users (content images)" ON storage.objects
    FOR DELETE
    USING (bucket_id = 'admin_content_images' AND auth.role() = 'authenticated');
