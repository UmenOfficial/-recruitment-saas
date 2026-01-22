
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function checkUserMapping(email: string) {
    console.log(`Checking mapping for ${email}...`);

    // 1. Get Auth User
    const { data: { users: authUsers }, error: authError } = await supabase.auth.admin.listUsers();
    const authUser = authUsers?.find(u => u.email === email);

    if (!authUser) {
        console.error("Auth user not found!");
        return;
    }
    console.log(`Auth ID:   ${authUser.id}`);

    // 2. Get Public User
    const { data: publicUser, error: publicError } = await supabase
        .from('users')
        .select('id')
        .eq('email', email)
        .single();

    if (publicError) {
        console.error("Public user not found!", publicError.message);
        return;
    }
    console.log(`Public ID: ${publicUser.id}`);

    if (authUser.id === publicUser.id) {
        console.log("✅ IDs Match. RLS logic `auth.uid() = user_id` is valid.");
    } else {
        console.error("❌ IDs DO NOT MATCH! RLS will fail.");
        console.error("This means 'test_results.user_id' (linked to public) != 'auth.uid()' (login session).");
    }
}

checkUserMapping('prodaum6660@gmail.com');
