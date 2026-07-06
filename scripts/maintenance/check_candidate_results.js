const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Error: Env variables are missing.');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkCandidateResults() {
    const email = 'prodaum6660@gmail.com';
    console.log(`Checking database for user: ${email}...`);

    // 1. Check in public.users
    const { data: dbUser, error: dbUserError } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .maybeSingle();

    if (dbUserError) {
        console.error('Error checking public.users:', dbUserError.message);
        return;
    }

    if (!dbUser) {
        console.log(`❌ User ${email} not found in public.users table!`);
    } else {
        console.log(`✅ Found in public.users: ID=${dbUser.id}, Role=${dbUser.role}, Name=${dbUser.full_name || dbUser.name}`);
    }

    // 2. Check in auth.users
    const { data: { users }, error: authError } = await supabase.auth.admin.listUsers();
    
    if (authError) {
        console.error('Error listing auth users:', authError.message);
    } else {
        const authUser = users.find(u => u.email === email);
        if (authUser) {
            console.log(`✅ Found in auth.users: ID=${authUser.id}, CreatedAt=${authUser.created_at}`);
            if (dbUser && dbUser.id !== authUser.id) {
                console.error(`⚠️ UUID MISMATCH! public.users ID (${dbUser.id}) != auth.users ID (${authUser.id})`);
            }
        } else {
            console.log(`❌ User ${email} not found in auth.users!`);
        }
    }

    // 3. Fetch test results for both UUIDs (just in case they mismatch)
    const uuidsToCheck = [];
    if (dbUser) uuidsToCheck.push(dbUser.id);
    if (users.find(u => u.email === email)) {
        const authId = users.find(u => u.email === email).id;
        if (!uuidsToCheck.includes(authId)) uuidsToCheck.push(authId);
    }

    for (const userId of uuidsToCheck) {
        console.log(`\nFetching test_results for User ID: ${userId}...`);
        const { data: results, error: resError } = await supabase
            .from('test_results')
            .select(`
                id,
                test_id,
                tests(title),
                attempt_number,
                total_score,
                completed_at,
                created_at
            `)
            .eq('user_id', userId);

        if (resError) {
            console.error('Error fetching test_results:', resError.message);
            continue;
        }

        console.log(`Found ${results.length} test results for ID ${userId}:`);
        results.forEach(r => {
            console.log(`- Result ID: ${r.id}`);
            console.log(`  Test: ${r.tests ? r.tests.title : 'Unknown'} (ID: ${r.test_id})`);
            console.log(`  Attempt: ${r.attempt_number}, Score: ${r.total_score}`);
            console.log(`  CompletedAt: ${r.completed_at}, CreatedAt: ${r.created_at}`);
        });
    }
}

checkCandidateResults();
