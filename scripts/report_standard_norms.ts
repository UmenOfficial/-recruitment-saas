
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

const STANDARD_TEST_ID = 'a724bab1-b7e2-4b99-a5a3-8ae47cd9411e';
const GLOBAL_TEST_ID = '8afa34fb-6300-4c5e-bc48-bbdb74c717d8';

async function reportStandardNorms() {
    console.log('--- Standard Personality Test Norms Report ---\n');

    // 1. Fetch Test Info to confirm name
    const { data: testInfo } = await supabase.from('tests').select('title').eq('id', STANDARD_TEST_ID).single();
    console.log(`Test: ${testInfo?.title} (ID: ${STANDARD_TEST_ID})`);

    // 2. Local Norms (Usually Competencies)
    const { data: localNorms } = await supabase
        .from('test_norms')
        .select('*')
        .eq('test_id', STANDARD_TEST_ID)
        .order('category_name');

    const competencies: any[] = [];
    const localScales: any[] = [];
    const others: any[] = [];

    localNorms?.forEach((n: any) => {
        if (n.category_name.startsWith('Comp_') || n.category_name === 'TOTAL') competencies.push(n);
        else if (n.category_name.startsWith('Scale_')) localScales.push(n);
        else others.push(n);
    });

    // 3. Global Norms (Scales applied to Standard Test)
    const { data: globalNorms } = await supabase
        .from('test_norms')
        .select('*')
        .eq('test_id', GLOBAL_TEST_ID)
        .like('category_name', 'Scale_%')
        .order('category_name');

    // REPORTING
    console.log(`\n### 1. Local Norms (Competencies & Custom Scales)`);
    if (competencies.length > 0) {
        console.log(`  **[Competencies]** (${competencies.length})`);
        competencies.forEach(n => console.log(`    - ${n.category_name}: Mean=${n.mean_value}, SD=${n.std_dev_value}`));
    }
    if (localScales.length > 0) {
        console.log(`  **[Local Scales]** (${localScales.length})`);
        localScales.forEach(n => console.log(`    - ${n.category_name}: Mean=${n.mean_value}, SD=${n.std_dev_value}`));
    }
    if (others.length > 0) {
        console.log(`  **[Unclassified]** (${others.length})`);
        others.forEach(n => console.log(`    - ${n.category_name}`));
    }

    console.log(`\n### 2. Global Norms (Applied Scales)`);
    if (globalNorms && globalNorms.length > 0) {
        console.log(`  **[Global Scales]** (${globalNorms.length})`);
        globalNorms.forEach(n => console.log(`    - ${n.category_name}: Mean=${n.mean_value}, SD=${n.std_dev_value}`));
    }
}

reportStandardNorms();
