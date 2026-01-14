-- =====================================================
-- PROMOTE USER TO SUPER ADMIN
-- updates only the role.
-- =====================================================

UPDATE users
SET role = 'SUPER_ADMIN'
WHERE email = 'prodaum6660@gmail.com';

-- Optional: If Super Admins should not be linked to a specific company in company_members,
-- you might want to delete their membership. 
-- DELETE FROM company_members WHERE user_id = (SELECT id FROM users WHERE email = 'prodaum6660@gmail.com');
-- However, keeping it doesn't hurt (they just ignore it due to Super Admin privileges).
