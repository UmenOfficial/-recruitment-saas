
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

const NIS_TEST_ID = '77ff6903-41f4-4b1f-97e2-8f42746b10e4';
const GLOBAL_TEST_ID = '8afa34fb-6300-4c5e-bc48-bbdb74c717d8';

async function inspectNISNorms() {
    console.log('--- NIS Personality Test Norms Inspection ---\n');

    // 1. Local Norms (Stored directly with NIS Test ID)
    const { data: localNorms } = await supabase
        .from('test_norms')
        .select('*')
        .eq('test_id', NIS_TEST_ID)
        .order('category_name');

    console.log(`[Local Storage] Found ${localNorms?.length} norms linked to NIS Test ID (${NIS_TEST_ID}):`);
    console.log('(These are used for Competency and Total scores)\n');

    localNorms?.forEach(n => {
        console.log(`  - Name: ${n.category_name.padEnd(25)} | Mean: ${n.mean_value} | SD: ${n.std_dev_value}`);
    });

    // 2. Global Scales (Applied to NIS Test via Logic)
    const { data: globalNorms } = await supabase
        .from('test_norms')
        .select('*')
        .eq('test_id', GLOBAL_TEST_ID)
        .like('category_name', 'Scale_%')
        .order('category_name');

    console.log(`\n[Global Reference] Found ${globalNorms?.length} Scale Norms (Global ID: ${GLOBAL_TEST_ID}):`);
    console.log('(These are applied to NIS Test for individual Scale scores)\n');

    globalNorms?.forEach(n => {
        console.log(`  - Name: ${n.category_name.padEnd(25)} | Mean: ${n.mean_value} | SD: ${n.std_dev_value}`);
    });
}

inspectNISNorms();
