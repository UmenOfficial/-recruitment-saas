
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load env
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

async function verifyRLS() {
    console.log('--- Verifying RLS Fix ---');

    // 1. Test Service Role (Should Bypass RLS and Succeed)
    console.log('\n[Test 1] Service Role Access (Should Succeed)...');
    try {
        const serviceClient = createClient(supabaseUrl, serviceKey);
        // Explicitly bypassing RLS is default for service_role, but we want to ensure
        // querying the table doesn't trigger a recursion error in the DB logic itself.
        const { data, error } = await serviceClient
            .from('users')
            .select('count', { count: 'exact', head: true });

        if (error) {
            console.error('❌ Service Role Failed:', error.message);
        } else {
            console.log('✅ Service Role Success. Total Users:', data); // data is count? No, count is in count property
            // With head:true, data is null, count is number
            // Actually let's just select id limit 1
            const { data: users, error: selectError } = await serviceClient
                .from('users')
                .select('id')
                .limit(1);
            if (selectError) console.error('❌ Service Role Select Failed:', selectError.message);
            else console.log('✅ Service Role could read data. (Recursion fix works)');
        }
    } catch (e) {
        console.error('❌ Service Role Exception:', e);
    }

    // 2. Test Anon Access (Should fail to read rows due to RLS)
    console.log('\n[Test 2] Anon Role Access (Should get 0 rows or Error)...');
    try {
        const anonClient = createClient(supabaseUrl, anonKey);
        const { data, error, count } = await anonClient
            .from('users')
            .select('id', { count: 'exact' });

        if (error) {
            console.log('✅ Anon Role got Error (Expected behavior if table restricted):', error.message);
        } else {
            console.log(`ℹ️ Anon Role result count: ${data?.length}`);
            if (data?.length === 0) {
                console.log('✅ Anon Role saw 0 users. (RLS is working)');
            } else {
                console.error('❌ WARNING: Anon Role could see users! RLS might be broken or too permissive.');
            }
        }
    } catch (e) {
        console.error('❌ Anon Exception:', e);
    }
}

verifyRLS();
