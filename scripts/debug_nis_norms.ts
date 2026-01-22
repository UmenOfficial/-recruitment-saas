
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function inspectNISNorms() {
    console.log('--- NIS Customizing Test Norms Inspection ---\n');

    // 1. Find the test ID
    const { data: tests } = await supabase
        .from('tests')
        .select('*')
        .ilike('title', '%NIS%') // Search for "NIS" in title
        .limit(1);

    if (!tests || tests.length === 0) {
        console.log('No test found with "NIS" in the title.');
        return;
    }

    const nisTest = tests[0];
    console.log(`Found Test: ${nisTest.title} (ID: ${nisTest.id})`);

    // 2. Local Norms
    const { data: localNorms } = await supabase
        .from('test_norms')
        .select('*')
        .eq('test_id', nisTest.id)
        .order('category_name');

    console.log(`\n[Local Storage] Found ${localNorms?.length} norms link to this test:`);

    localNorms?.forEach(n => {
        console.log(`  - Name: ${n.category_name.padEnd(20)} | Mean: ${n.mean_value} | SD: ${n.std_dev_value}`);
    });
}

inspectNISNorms();
