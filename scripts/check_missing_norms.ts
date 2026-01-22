
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

const GLOBAL_TEST_ID = '8afa34fb-6300-4c5e-bc48-bbdb74c717d8';

async function checkMissingNorms() {
    console.log('--- Checking Missing Norms ---\n');

    // 1. Get Global Norms (Master List)
    const { data: globalNorms } = await supabase
        .from('test_norms')
        .select('category_name')
        .eq('test_id', GLOBAL_TEST_ID)
        .like('category_name', 'Scale_%'); // Only Scales

    const globalSet = new Set(globalNorms?.map(n => n.category_name));
    console.log(`Global Standard Scales: ${globalSet.size} items`);

    // 2. Get NIS Norms
    const { data: tests } = await supabase.from('tests').select('id, title').ilike('title', '%NIS%');
    if (!tests || tests.length === 0) return;

    for (const test of tests) {
        console.log(`\n### Test: ${test.title}`);

        const { data: localNorms } = await supabase
            .from('test_norms')
            .select('category_name')
            .eq('test_id', test.id)
            .like('category_name', 'Scale_%');

        const localSet = new Set(localNorms?.map(n => n.category_name));
        console.log(`  Current NIS Scales: ${localSet.size} items`);

        // 3. Find Missing
        const missing: string[] = [];
        globalSet.forEach(gName => {
            if (!localSet.has(gName)) {
                missing.push(gName);
            }
        });

        if (missing.length > 0) {
            console.log(`  MISSING (${missing.length} items):`);
            missing.sort().forEach(m => console.log(`    - ${m.replace('Scale_', '')}`)); // Print plain names for readability
        } else {
            console.log('  No missing scales.');
        }

        // 4. Check for Image Items specifically (The 42 items mentioned)
        // Image likely has: 개방성, 개선성 ... 거짓말, 지시불이행, 자기신뢰도검증 ...
        // Let's verify if the missing list covers the expected items from image.
        const specialItems = ['거짓말', '지시불이행', '자기신뢰도검증', '공격성', '불안/우울장애'];
        const missingSet = new Set(missing.map(m => m.replace('Scale_', '')));

        const specialMissing = specialItems.filter(s => missingSet.has(s));
        if (specialMissing.length > 0) {
            console.log(`  \n  [Critical Missing from Image]: ${specialMissing.join(', ')}`);
        }
    }
}

checkMissingNorms();
