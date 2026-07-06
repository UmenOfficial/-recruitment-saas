const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Error: Env variables are missing.');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkRecentResults() {
    console.log('Fetching test results created on or after 2026-06-25...');
    
    const { data: results, error } = await supabase
        .from('test_results')
        .select(`
            id,
            user_id,
            users(email, full_name),
            test_id,
            tests(title),
            attempt_number,
            total_score,
            completed_at,
            created_at
        `)
        .gte('created_at', '2026-06-25T00:00:00Z')
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Failed to fetch recent results:', error.message);
        return;
    }

    console.log(`Found ${results.length} test results recently:`);
    results.forEach(r => {
        const u = r.users || { email: 'Unknown', full_name: 'Unknown' };
        console.log(`- Result ID: ${r.id}`);
        console.log(`  User: ${u.full_name} (${u.email}) [ID: ${r.user_id}]`);
        console.log(`  Test: ${r.tests ? r.tests.title : 'Unknown'} (ID: ${r.test_id})`);
        console.log(`  Attempt: ${r.attempt_number}, Score: ${r.total_score}`);
        console.log(`  CompletedAt: ${r.completed_at}, CreatedAt: ${r.created_at}`);
    });
}

checkRecentResults();
