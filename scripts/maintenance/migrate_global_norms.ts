
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
    console.error('Missing environment variables');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

async function migrateNorms() {
    const GLOBAL_TEST_ID = '8afa34fb-6300-4c5e-bc48-bbdb74c717d8';
    const SOURCE_TEST_ID = '77ff6903-41f4-4b1f-97e2-8f42746b10e4'; // NIS Customizing Test

    console.log(`Migrating norms from ${SOURCE_TEST_ID} to ${GLOBAL_TEST_ID}...`);

    // 1. Fetch Source Norms
    const { data: sourceNorms, error: fetchError } = await supabase
        .from('test_norms')
        .select('*')
        .eq('test_id', SOURCE_TEST_ID);

    if (fetchError) {
        console.error('Fetch failed:', fetchError);
        return;
    }

    // 2. Filter for Scales (Scale_*) and Reliability (Clinical, Validity)
    // Exclude Competencies (Comp_*) and Total (Comp_TOTAL or TOTAL)
    // Logic: Keep anything starting with 'Scale_'
    // AND keep specific clinical keys if they don't have Scale_ prefix (e.g. if they are just raw names)
    // Actually, based on previous inspection, everything seems to be prefixed.
    // Let's verify via the passed data.

    const normsToMigrate = sourceNorms.filter(n => {
        const name = n.category_name;
        // Keep Scales
        if (name.startsWith('Scale_')) return true;

        // Exclude Comps
        if (name.startsWith('Comp_')) return false;

        // If legacy names exist without prefix, deciding whether to keep them.
        // Assuming verification showed 'Scale_개방성' format.
        // Let's protect against 'TOTAL' just in case.
        if (name === 'TOTAL' || name === 'Comp_TOTAL') return false;

        return true;
    });

    console.log(`Found ${normsToMigrate.length} norms to migrate.`);

    // 3. Insert into Global Test
    const payload = normsToMigrate.map(n => ({
        test_id: GLOBAL_TEST_ID,
        category_name: n.category_name,
        mean_value: n.mean_value,
        std_dev_value: n.std_dev_value
    }));

    if (payload.length > 0) {
        const { error: insertError } = await supabase
            .from('test_norms')
            .upsert(payload, { onConflict: 'test_id, category_name' });

        if (insertError) {
            console.error('Insert failed:', insertError);
        } else {
            console.log('Migration successful!');
        }
    } else {
        console.log('No norms to migrate.');
    }
}

migrateNorms();
