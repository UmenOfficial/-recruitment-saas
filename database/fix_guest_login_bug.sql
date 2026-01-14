
-- [Fix] Guest Login Bug (Database error saving new user)
-- Cause: Anonymous users (Guest) have NULL email, but public.users table enforces NOT NULL.
-- Fix: Update trigger to generate a placeholder email for guests.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, role)
  VALUES (
    new.id,
    -- If email is null (Guest), generate a unique placeholder
    COALESCE(new.email, 'guest_' || new.id || '@umen.cloud'),
    new.raw_user_meta_data->>'full_name',
    'CANDIDATE' -- Default role
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
