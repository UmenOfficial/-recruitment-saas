
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error("Missing Supabase credentials");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkGlobalNorms() {
    const GLOBAL_TEST_ID = '8afa34fb-6300-4c5e-bc48-bbdb74c717d8'; // From route.ts
    console.log(`Checking Global Norms for ID: ${GLOBAL_TEST_ID}...`);

    const { data: globalNorms, error } = await supabase
        .from('test_norms')
        .select('*')
        .eq('test_id', GLOBAL_TEST_ID);

    if (error) {
        console.error("Error fetching global norms:", error);
        return;
    }

    console.log(`Found ${globalNorms?.length || 0} Global Norms.`);

    if (globalNorms && globalNorms.length > 0) {
        const scaleNorms = globalNorms.filter(n => n.category_name.startsWith('Scale_'));
        const otherNorms = globalNorms.filter(n => !n.category_name.startsWith('Scale_'));

        console.log(`- Scale Norms: ${scaleNorms.length}`);
        console.log(`- Other Norms: ${otherNorms.length}`);

        if (scaleNorms.length > 0) {
            console.log("Sample Global Scale Norms:");
            scaleNorms.slice(0, 3).forEach(n => console.log(`  [${n.category_name}] Mean: ${n.mean_value}, SD: ${n.std_dev_value}`));
        }
    }

    // Also check NIS Test Norms again briefly for comparison
    const { data: nisTest } = await supabase.from('tests').select('id').ilike('title', '%NIS Customizing Test%').single();
    if (nisTest) {
        const { count } = await supabase.from('test_norms').select('*', { count: 'exact', head: true }).eq('test_id', nisTest.id);
        console.log(`\n(Comparison) NIS Local Norms Count: ${count}`);
    }
}

checkGlobalNorms();
