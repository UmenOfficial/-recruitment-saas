
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing env vars');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
    const testId = '159ade9e-5994-4bdf-a7f9-c08514dcf77f';
    console.log(`Checking norms for test_id: ${testId}`);

    const { data: norms, error } = await supabase
        .from('test_norms')
        .select('*')
        .eq('test_id', testId);

    if (error) {
        console.error('Error:', error);
        return;
    }

    console.log('--- Test Norms ---');
    console.table(norms.map(n => ({
        category: n.category_name,
        mean: n.mean_value,
        std_dev: n.std_dev_value
    })));
}

main();
