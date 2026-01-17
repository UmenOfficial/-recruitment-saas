
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

const STANDARD_TEST_ID = 'a724bab1-b7e2-4b99-a5a3-8ae47cd9411e';
const GLOBAL_TEST_ID = '8afa34fb-6300-4c5e-bc48-bbdb74c717d8';

async function inspectStandardNorms() {
    console.log('--- Standard Personality Test Norms Inspection ---\n');

    // 1. Local Norms (Stored directly with Standard Test ID)
    const { data: localNorms } = await supabase
        .from('test_norms')
        .select('*')
        .eq('test_id', STANDARD_TEST_ID)
        .order('category_name');

    console.log(`[Local Storage] Found ${localNorms?.length} norms linked to Standard Test ID:`);
    console.log('(These are used for Competency scores)\n');

    localNorms?.forEach(n => {
        console.log(`  - ID: ${n.id} | Name: ${n.category_name.padEnd(20)} | Mean: ${n.mean_value} | SD: ${n.std_dev_value}`);
    });

    // 2. Global Scales (Applied to Standard Test via Logic)
    const { data: globalNorms } = await supabase
        .from('test_norms')
        .select('*')
        .eq('test_id', GLOBAL_TEST_ID)
        .like('category_name', 'Scale_%')
        .order('category_name');

    console.log(`\n[Global Reference] Found ${globalNorms?.length} Scale Norms (Global ID):`);
    console.log('(These are applied to Standard Test for Scale scores)\n');

    globalNorms?.forEach(n => console.log(`  - Name: ${n.category_name.padEnd(20)} | Mean: ${n.mean_value} | SD: ${n.std_dev_value}`));
}

inspectStandardNorms();
