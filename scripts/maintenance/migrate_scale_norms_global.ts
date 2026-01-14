
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

const GLOBAL_TEST_ID = '8afa34fb-6300-4c5e-bc48-bbdb74c717d8';

async function migrateScaleNorms() {
    console.log("Searching for 'NIS Customizing Test'...");

    // 1. Find Source Test ID (NIS)
    const { data: tests } = await supabase
        .from('tests')
        .select('id, title')
        .ilike('title', '%NIS Customizing Test%')
        .single();

    if (!tests) {
        console.error("NIS Test not found");
        return;
    }

    const sourceTestId = tests.id;
    console.log(`Source Test: ${tests.title} (${sourceTestId})`);
    console.log(`Target Global ID: ${GLOBAL_TEST_ID}`);

    // vvvvv NEW: Check/Create Global Test Record vvvvv
    const { data: globalTest } = await supabase.from('tests').select('id').eq('id', GLOBAL_TEST_ID).single();

    if (!globalTest) {
        console.log("Global Test record not found. Creating placeholder...");
        const { error: createError } = await supabase.from('tests').insert({
            id: GLOBAL_TEST_ID,
            title: 'Global Scale Norms',
            type: 'PERSONALITY', // Or whatever type
            description: 'Placeholder for global scale norms'
        });

        if (createError) {
            console.error("Failed to create Global Test record:", createError);
            return;
        }
        console.log("Created Global Test record.");
    } else {
        console.log("Global Test record exists.");
    }
    // ^^^^^ NEW ^^^^^

    // 2. Identify Scale Norms to migrate (StartsWith 'Scale_')
    const { data: scaleNorms, error: fetchError } = await supabase
        .from('test_norms')
        .select('*')
        .eq('test_id', sourceTestId)
        .like('category_name', 'Scale_%');

    if (fetchError) {
        console.error("Error fetching norms:", fetchError);
        return;
    }

    if (!scaleNorms || scaleNorms.length === 0) {
        console.log("No Scale norms found in source test to migrate.");
        return;
    }

    console.log(`Found ${scaleNorms.length} Scale Norms. Migrating to Global...`);

    // 3. Update test_id
    // We can do a bulk update
    const { error: updateError, count } = await supabase
        .from('test_norms')
        .update({ test_id: GLOBAL_TEST_ID })
        .eq('test_id', sourceTestId)
        .like('category_name', 'Scale_%')
        .select('id', { count: 'exact' });

    if (updateError) {
        console.error("Migration failed:", updateError);
    } else {
        console.log(`Successfully migrated ${count} norms to Global ID.`);
    }

    // 4. Verify distribution
    const { count: globalCount } = await supabase.from('test_norms').select('*', { count: 'exact', head: true }).eq('test_id', GLOBAL_TEST_ID);
    const { count: localCount } = await supabase.from('test_norms').select('*', { count: 'exact', head: true }).eq('test_id', sourceTestId);

    console.log("\n--- Final Status ---");
    console.log(`Global Norms: ${globalCount} (Should be ~43)`);
    console.log(`Local (NIS) Norms: ${localCount} (Should be ~19)`);
}

migrateScaleNorms();
