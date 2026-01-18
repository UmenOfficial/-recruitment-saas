
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, serviceKey);

async function checkUserRole() {
    const email = 'prodaum6660@gmail.com';
    console.log(`Checking role for: ${email}`);

    // We need to look up the ID from auth.users via RPC or just query public.users if we trust it exists there
    // Since we are Service Role, we can query public.users directly.
    const { data: users, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', email);

    if (error) {
        console.error('Error fetching user:', error.message);
    } else {
        if (users && users.length > 0) {
            console.log('User Found in public.users:', users[0]);
            console.log(`Current Role: [${users[0].role}]`);

            if (users[0].role !== 'ADMIN' && users[0].role !== 'SUPER_ADMIN') {
                console.log('⚠️ WARNING: User is NOT an ADMIN. This explains the redirect.');
            } else {
                console.log('✅ User IS an ADMIN. Check Middleware or Logic.');
            }
        } else {
            console.log('❌ User NOT found in public.users table!');

            // Try to search in valid users to see if auth UID exists but public record missing?
            // Cannot access auth.users directly via JS client usually without special config.
        }
    }
}

checkUserRole();
