
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function inspectTotal() {
    console.log("Inspecting TOTAL norm and Competency Count...");

    // Get Test ID
    const { data: test } = await supabase.from('tests').select('id').ilike('title', '%NIS%').single();
    if (!test) { console.log('Test not found'); return; }
    console.log(`Test ID: ${test.id}`);

    // 1. Get Comparisons (Competencies) to know how many are summed
    // Note: The script 'seed_test_results.ts' sums scores of ALL competencies for Total
    const { data: comps } = await supabase.from('competencies').select('name').eq('test_id', test.id);
    console.log(`Competency Count: ${comps?.length || 0}`);
    comps?.forEach(c => console.log(` - ${c.name}`));

    // 2. Get TOTAL Norm
    const { data: norms } = await supabase
        .from('test_norms')
        .select('*')
        .eq('test_id', test.id)
        .ilike('category_name', '%total%');

    console.log(`\nFound ${norms?.length || 0} Total Norms:`);
    norms?.forEach(n => {
        console.log(`  Name: ${n.category_name}, Mean: ${n.mean_value}, SD: ${n.std_dev_value}`);
    });
}

inspectTotal();
