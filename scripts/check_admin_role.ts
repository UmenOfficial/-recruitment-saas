
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function main() {
    const email = 'prodaum6660@gmail.com';
    console.log(`Checking role for: ${email}`);

    // 1. Get User ID from Auth (Optional, but good for cross check)
    // Actually, we can just query public.users directly if email is synced.

    // 2. Query public.users
    const { data: users, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', email);

    if (error) {
        console.error('Error fetching user:', error);
        return;
    }

    if (!users || users.length === 0) {
        console.log('User not found in public.users table!');
    } else {
        users.forEach(u => {
            console.log(`Found User: ID=${u.id}, Role=${u.role}, Name=${u.name}`);
        });
    }
}

main();
