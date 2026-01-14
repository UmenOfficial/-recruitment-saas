-- 1. Create 'questions' bucket if not exists
INSERT INTO storage.buckets (id, name, public)
VALUES ('questions', 'questions', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Drop existing policies to avoid conflicts during re-run
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Upload" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Update" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Delete" ON storage.objects;

-- 3. Policy: Public Read Access (Anyone can view images)
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING ( bucket_id = 'questions' );

-- 4. Policy: Authenticated Upload (Admins can upload into 'covers/' folder)
CREATE POLICY "Authenticated Upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK ( bucket_id = 'questions' );

-- 5. Policy: Authenticated Update (Admins can manage files)
CREATE POLICY "Authenticated Update"
ON storage.objects FOR UPDATE
TO authenticated
USING ( bucket_id = 'questions' );

-- 6. Policy: Authenticated Delete (Admins can delete files)
CREATE POLICY "Authenticated Delete"
ON storage.objects FOR DELETE
TO authenticated
USING ( bucket_id = 'questions' );
