
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

async function checkDependencies() {
    console.log("--- Checking RLS Dependencies ---");

    // 1. Check 'tests' table access (Anon & Auth)
    const anonClient = createClient(supabaseUrl, anonKey);

    console.log("Checking 'tests' table access (Anon)...");
    const { data: tests, error: testError } = await anonClient.from('tests').select('id, title').limit(1);
    if (testError) {
        console.error("❌ 'tests' table is BLOCKED for Anon:", testError.message);
    } else {
        console.log("✅ 'tests' table is READABLE for Anon (Count:", tests?.length, ")");
    }

    // 2. Check 'test_results' table access (Anon) - Should be blocked or empty
    console.log("Checking 'test_results' table access (Anon)...");
    const { error: resultError } = await anonClient.from('test_results').select('id').limit(1);
    if (resultError) {
        console.log("ℹ️ 'test_results' returned error (Expected if RLS on & no policy):", resultError.message); // Likely 401 or permission denied lookalikes
    } else {
        console.log("⚠️ 'test_results' is READABLE by Anon? (This implies RLS might be OFF or Public)");
    }

    // 3. Verify Admin Dashboard Action Strategy (Code Check implied, but let's check one ID access)
    // Simulating Service Role Access (Admin)
    const serviceClient = createClient(supabaseUrl, serviceKey);
    const { data: adminData, error: adminError } = await serviceClient.from('test_results').select('count', { count: 'exact', head: true });
    if (adminError) {
        console.error("❌ Service Role BLOCKED on 'test_results'? (CRITICAL):", adminError.message);
    } else {
        console.log("✅ Service Role can access 'test_results' (Admin Dashboard Safe). Count:", adminData); // Actually count is in 'count' prop
    }
}

checkDependencies();
