
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function checkRecentUsers() {
    console.log('--- Checking Users (Created > 2026-01-23) ---\n');

    // 1. Check New Signups
    const { data: newUsers, error } = await supabase
        .from('users')
        .select('id, email, created_at') // public.users often doesn't have last_sign_in_at
        .gte('created_at', '2026-01-23T00:00:00');

    if (error) console.error(error);

    console.log(`New Users since Jan 23: ${newUsers?.length || 0}`);
    newUsers?.forEach(u => {
        console.log(`  - [${u.created_at}] ${u.email} (Guest? ${u.email?.startsWith('guest_')})`);
    });

    // 2. Check Recent Logins (if column exists/populated) 
    // Supabase Auth stores `last_sign_in_at` in `auth.users`, but not necessarily synced to `public.users` unless triggered.
    // Let's check `public.users` first.

    console.log('\n--- Checking Recent Test Results > Jan 23 ---');
    const { data: results } = await supabase
        .from('test_results')
        .select('id, user_id, created_at, user:users(email)')
        .gte('created_at', '2026-01-23T00:00:00');

    console.log(`Test Results since Jan 23: ${results?.length || 0}`);
    results?.forEach(r => {
        const email = (r.user as any)?.email;
        console.log(`  - [${r.created_at}] User: ${email}`);
    });
}

checkRecentUsers();
