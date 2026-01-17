
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

const GLOBAL_TEST_ID = '8afa34fb-6300-4c5e-bc48-bbdb74c717d8';

async function listNorms() {
    console.log('--- Final Norm Configuration ---\n');

    // 1. Global Scales
    const { data: global } = await supabase
        .from('test_norms')
        .select('category_name, mean_value, std_dev_value')
        .eq('test_id', GLOBAL_TEST_ID)
        .order('category_name');

    console.log('# Global Scales (Common for All)');
    global?.forEach(n => {
        console.log(`- ${n.category_name.replace('Scale_', '')}: M=${n.mean_value}, SD=${n.std_dev_value}`);
    });

    // 2. Local Norms (For each test)
    const { data: tests } = await supabase
        .from('tests')
        .select('id, title')
        .eq('type', 'PERSONALITY') // Fetch only personality tests
        .neq('id', GLOBAL_TEST_ID); // Exclude the global placeholder

    for (const t of tests || []) {
        console.log(`\n# Local Norms: ${t.title}`);
        const { data: local } = await supabase
            .from('test_norms')
            .select('category_name, mean_value, std_dev_value')
            .eq('test_id', t.id)
            .order('category_name');

        local?.forEach(n => {
            console.log(`  - ${n.category_name}: M=${n.mean_value}, SD=${n.std_dev_value}`);
        });
    }
}

listNorms();
