
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function verifyNormsPrefix() {
    console.log("Starting Norms Verification...");

    const testName = '김현근 표준 검사';
    const { data: test } = await supabase.from('tests').select('id').ilike('title', `%${testName}%`).single();
    if (!test) { console.error("Test not found"); return; }

    // 1. Fetch ALL norms for this test
    const { data: norms, error } = await supabase
        .from('test_norms')
        .select('category_name, mean_value, std_dev_value')
        .eq('test_id', test.id);

    if (error) { console.error(error); return; }

    console.log(`Total Norms found: ${norms?.length}`);

    const prefixedScale = norms?.filter(n => n.category_name.startsWith('Scale_')) || [];
    const prefixedComp = norms?.filter(n => n.category_name.startsWith('Comp_')) || [];
    const plain = norms?.filter(n => !n.category_name.startsWith('Scale_') && !n.category_name.startsWith('Comp_') && n.category_name !== 'TOTAL') || [];

    console.log(`\n--- Summary ---`);
    console.log(`✅ Prefixed 'Scale_': ${prefixedScale.length} items`);
    console.log(`✅ Prefixed 'Comp_': ${prefixedComp.length} items`);
    console.log(`⚠️ Plain (Potential Duplicates): ${plain.length} items`);

    if (plain.length > 0) {
        console.log(`\n--- List of Plain Names (Legacy/Duplicate?) ---`);
        plain.forEach(n => {
            const hasScale = prefixedScale.find(p => p.category_name === `Scale_${n.category_name}`);
            const hasComp = prefixedComp.find(p => p.category_name === `Comp_${n.category_name}`);

            let status = '';
            if (hasScale && hasComp) status = '[COLLISION RISK: Has both Scale_ and Comp_]';
            else if (hasScale) status = '[Duplicated by Scale_]';
            else if (hasComp) status = '[Duplicated by Comp_]';
            else status = '[Unique Plain]';

            console.log(`- "${n.category_name}" (Mean: ${n.mean_value}) -> ${status}`);
        });
    }

    // Specific check for '협동성'
    const coop = norms?.filter(n => n.category_name.includes('협동성'));
    console.log(`\n--- Specific Check: 협동성 ---`);
    coop?.forEach(n => console.log(`"${n.category_name}": Mean=${n.mean_value}`));
}

verifyNormsPrefix();
