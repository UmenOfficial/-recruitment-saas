
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

const STANDARD_TEST_ID = 'a724bab1-b7e2-4b99-a5a3-8ae47cd9411e';

async function cleanupOldNorms() {
    console.log(`Cleaning up legacy norms for Standard Test (${STANDARD_TEST_ID})...`);

    // Target legacy names that lack 'Comp_' prefix
    const targets = ['도전', '헌신', '혁신', 'TOTAL'];

    const { data, error, count } = await supabase
        .from('test_norms')
        .delete({ count: 'exact' })
        .eq('test_id', STANDARD_TEST_ID)
        .in('category_name', targets);

    if (error) {
        console.error('Error deleting norms:', error);
    } else {
        console.log(`Successfully deleted ${count} legacy norms: ${targets.join(', ')}`);
    }
}

cleanupOldNorms();
