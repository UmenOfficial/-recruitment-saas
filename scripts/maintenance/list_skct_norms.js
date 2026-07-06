const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Error: Env variables are missing.');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function listSkctNorms() {
    const testId = '6fb57cd5-e320-4201-a93a-384a711aff41'; // 2026년 SKCT
    console.log(`Listing norms stored in test_norms for test ID: ${testId}...`);

    const { data: norms, error } = await supabase
        .from('test_norms')
        .select('category_name, mean_value, std_dev_value')
        .eq('test_id', testId)
        .order('category_name', { ascending: true });

    if (error) {
        console.error('Error:', error.message);
        return;
    }

    console.log(`Found ${norms.length} norm definitions:`);
    console.table(norms.map(n => ({
        'Category Name': n.category_name,
        'Mean (평균)': n.mean_value,
        'SD (표준편차)': n.std_dev_value
    })));
}

listSkctNorms();
