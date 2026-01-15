
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const supabaseAnon = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

async function fullScan() {
    console.log("--- Starting Full Inspection ---");

    // 1. Find Test ID
    const { data: tests } = await supabaseAdmin
        .from('tests')
        .select('id, title')
        .ilike('title', '%표준 인성%')
        .limit(1);

    if (!tests || tests.length === 0) {
        console.error("❌ Test not found.");
        return;
    }
    const test = tests[0];
    console.log(`✅ Found Test: ${test.title} (${test.id})`);

    // 2. Create Auth User & Login
    const email = `debug.user.${Date.now()}@gmail.com`;
    const password = 'password123';
    console.log(`\n[Auth] Creating verified temp user: ${email}`);

    // A. Create User (Admin API - No confirmation needed)
    const { data: userData, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true
    });

    if (createError) {
        console.error("❌ Create User Error:", createError);
        return;
    }
    console.log(`   User created: ${userData.user.id}`);

    // B. Sign In (to get Session)
    const { data: authData, error: loginError } = await supabaseAnon.auth.signInWithPassword({
        email,
        password
    });

    if (loginError) {
        console.error("❌ Login Error:", loginError);
        return;
    }

    if (!authData.session) {
        console.error("❌ No Session returned after login. Weird.");
        return;
    }

    const token = authData.session.access_token;
    console.log("✅ Logged in successfully. Token obtained.");

    const supabaseAuth = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        { global: { headers: { Authorization: `Bearer ${token}` } } }
    );

    // 3. Check 'test_questions' (Read)
    console.log("\n[Check 1] Reading test_questions...");
    const { data: qData, error: qError } = await supabaseAuth
        .from('test_questions')
        .select('question_id')
        .eq('test_id', test.id)
        .limit(5);

    if (qError) {
        console.error("❌ test_questions READ FAILED:", qError.message);
        console.error("   Details:", qError);
    } else if (!qData || qData.length === 0) {
        console.error("❌ test_questions READ returned 0 rows (BLOCKED).");
    } else {
        console.log(`✅ test_questions READ SUCCESS (Rows: ${qData.length})`);
    }

    // 4. Check 'test_results' (Recursive Risk)
    console.log("\n[Check 2] Reading test_results (Select)...");
    const { data: rData, error: rError } = await supabaseAuth
        .from('test_results')
        .select('id')
        .eq('user_id', userData.user.id)
        .limit(1);

    if (rError) {
        console.error("❌ test_results SELECT FAILED:", rError.message);
    } else {
        console.log("✅ test_results SELECT SUCCESS.");
    }

    console.log("\n[Check 3] Writing test_results (Insert)...");
    const { error: iError } = await supabaseAuth
        .from('test_results')
        .insert({
            test_id: test.id,
            user_id: userData.user.id,
            attempt_number: 1,
            started_at: new Date().toISOString()
        });

    if (iError) {
        console.error("❌ test_results INSERT FAILED:", iError.message);
    } else {
        console.log("✅ test_results INSERT SUCCESS.");
    }
}

fullScan();
