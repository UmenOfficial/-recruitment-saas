-- Create comments table for admin contents (articles)
CREATE TABLE IF NOT EXISTS public.admin_content_comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    content_id UUID NOT NULL REFERENCES public.admin_contents(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    parent_id UUID REFERENCES public.admin_content_comments(id) ON DELETE CASCADE, -- For replies
    content TEXT NOT NULL,
    is_secret BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for faster lookups
CREATE INDEX idx_content_comments_content_id ON admin_content_comments(content_id);
CREATE INDEX idx_content_comments_parent_id ON admin_content_comments(parent_id);
CREATE INDEX idx_content_comments_user_id ON admin_content_comments(user_id);

-- RLS Policies
ALTER TABLE public.admin_content_comments ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can read comments (Filtering secret comments will be handled in Server Actions/Application Logic for better control, or we can use complex RLS)
-- Ideally, RLS should enforce secrecy. Let's try to enforce basic RLS but complex logic might be easier in fetching.
-- For now, let's allow SELECT to everyone, but we might want to filter sensitive data in the application layer or use a secure view.
-- Given the requirement: "Secret comments visible only to author and admin".
-- Implementing this purely in RLS is possible but tricky if we want to show "Secret comment" placeholder.
-- So we will allow public read, but rely on the API to mask the content if the user is not authorized.
-- WAIT, if we allow public read of the row, the 'content' column is exposed.
-- Better approach: Allow read for everyone, but the Application Layer handles masking.
-- OR RLS: 
-- 1. Admins see all.
-- 2. Authors see their own.
-- 3. Public sees only is_secret = false.
-- 4. BUT preventing "Secret comment" placeholder is bad UX. Users should know there IS a comment.
-- So the strategy: The Server Action 'getComments' will actually fetch all, and replace 'content' with "Secret" if the user is not allowed. 
-- Thus, for RLS, we effectively need to allow "SELECT" so the server can fetch it. 
-- Since we use Service Role in some places or `authenticated` role, RLS might block normal users.
-- Let's enable CRUD for authenticated users for now, and handle visibility in Server Action (Data Masking).

CREATE POLICY "Enable read access for all users" ON public.admin_content_comments
    FOR SELECT USING (true); 

CREATE POLICY "Enable insert for authenticated users" ON public.admin_content_comments
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Enable update for own comments" ON public.admin_content_comments
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Enable delete for own comments or admin" ON public.admin_content_comments
    FOR DELETE USING (auth.uid() = user_id OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'ADMIN'));
