SELECT count(*) as user_count, id, email, role FROM users WHERE id = '6cf05832-cffa-4862-ba09-a2a506c09b1d' GROUP BY id, email, role;
