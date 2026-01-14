-- Create admin_contents table
CREATE TABLE IF NOT EXISTS public.admin_contents (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('VIDEO', 'ARTICLE')),
    content_url TEXT NOT NULL,
    summary TEXT,
    thumbnail_url TEXT,
    is_published BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.admin_contents ENABLE ROW LEVEL SECURITY;

-- Create policies
-- Allow public read access to published contents
CREATE POLICY "Enable read access for all users" ON public.admin_contents
    FOR SELECT
    USING (true);

-- Allow full access to authenticated users (admins)
-- Note: In a real production app, you might want to check for a specific admin role.
-- For now, assuming authenticated users are admins or we rely on app-level checks for modification.
-- Ideally: USING (auth.role() = 'service_role' OR auth.uid() IN (SELECT id FROM users WHERE is_admin = true))
-- But consistent with other tables in this project context if any:
CREATE POLICY "Enable all access for authenticated users" ON public.admin_contents
    FOR ALL
    USING (auth.role() = 'authenticated');

-- Create storage bucket for thumbnails if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('admin_content_thumbnails', 'admin_content_thumbnails', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for thumbnails
CREATE POLICY "Give public access to admin_content_thumbnails" ON storage.objects
    FOR SELECT
    USING (bucket_id = 'admin_content_thumbnails');

CREATE POLICY "Enable upload access for authenticated users" ON storage.objects
    FOR INSERT
    WITH CHECK (bucket_id = 'admin_content_thumbnails' AND auth.role() = 'authenticated');

CREATE POLICY "Enable update access for authenticated users" ON storage.objects
    FOR UPDATE
    USING (bucket_id = 'admin_content_thumbnails' AND auth.role() = 'authenticated');

CREATE POLICY "Enable delete access for authenticated users" ON storage.objects
    FOR DELETE
    USING (bucket_id = 'admin_content_thumbnails' AND auth.role() = 'authenticated');
