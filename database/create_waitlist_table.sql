-- Create waitlist table
CREATE TABLE IF NOT EXISTS waitlist (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    agreed_privacy BOOLEAN DEFAULT TRUE
);

-- Enable RLS
ALTER TABLE waitlist ENABLE ROW LEVEL SECURITY;

-- Allow public insert (so users can sign up)
-- We check that the user is really inserting their own email? No, anon users don't have ID.
-- Just allow any insert.
DROP POLICY IF EXISTS "Enable insert for everyone" ON waitlist;
CREATE POLICY "Enable insert for everyone" ON waitlist
    FOR INSERT
    WITH CHECK (true);

-- Allow select ONLY for admins (service role will bypass this anyway)
-- We do NOT allow public select to protect emails.
DROP POLICY IF EXISTS "Enable select for admins only" ON waitlist;
CREATE POLICY "Enable select for admins only" ON waitlist
    FOR SELECT
    USING (auth.role() = 'service_role');
