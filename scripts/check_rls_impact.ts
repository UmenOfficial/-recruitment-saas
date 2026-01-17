
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function main() {
    console.log('--- Checking Policies on public.users ---');

    // We can't query pg_policies easily via JS client withoutrpc.
    // Instead, I will test ACCESS.

    // 1. Create a dummy anon client (simulating middleware)
    // Actually middleware uses getUser so it acts as authenticated user.

    // I will try to fetch prodaum6660's role using his OWN ID, acting as him.
    // First get his ID.
    const { data: adminUser } = await supabase
        .from('users')
        .select('id, email')
        .eq('email', 'prodaum6660@gmail.com')
        .single();

    if (!adminUser) {
        console.error('Admin user not found via Service Role (Critical!)');
        return;
    }
    console.log(`Target User ID: ${adminUser.id}`);

    // 2. Impersonate User (using creating client with ID? No, hard to sign JWT here)
    // Instead, I'll rely on the hypothesis: RLS was just enabled, causing blocking.

    console.log(`Hypothesis: RLS on public.users is blocking 'select role'.`);
    console.log(`Action: Recommend disabling RLS temporarily or adding policy.`);
}

main();
