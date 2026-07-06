const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Error: Env variables are missing.');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkAllTestsNorms() {
    console.log('Fetching active personality tests...');
    
    const { data: tests, error: testError } = await supabase
        .from('tests')
        .select('id, title, type, status')
        .eq('type', 'PERSONALITY');

    if (testError) {
        console.error('Error fetching tests:', testError.message);
        return;
    }

    console.log(`Found ${tests.length} personality tests:`);
    
    for (const test of tests) {
        const { data: norms, error: normError } = await supabase
            .from('test_norms')
            .select('category_name')
            .eq('test_id', test.id);
            
        if (normError) {
            console.error(`Error fetching norms for ${test.title}:`, normError.message);
            continue;
        }
        
        console.log(`- [${test.status}] "${test.title}" (ID: ${test.id}): ${norms.length} 로컬 규준 보유`);
        if (norms.length > 0) {
            console.log(`  └ 규준 리스트: ${norms.map(n => n.category_name).join(', ')}`);
        }
    }
}

checkAllTestsNorms();
