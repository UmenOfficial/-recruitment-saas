
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase environment variables');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function copyData() {
    console.log('--- Copying Test Results ---');

    // Source: Standard Personality Test
    const SOURCE_TEST_ID = '131ce476-3d6d-453c-a2a1-70fa5c73289d';
    // Target: NIS Customizing Test
    const TARGET_TEST_ID = '77ff6903-41f4-4b1f-97e2-8f42746b10e4';

    // 1. Check if Target already has data
    const { count, error: countError } = await supabase
        .from('test_results')
        .select('*', { count: 'exact', head: true })
        .eq('test_id', TARGET_TEST_ID);

    if (countError) {
        console.error('Check Target Error:', countError);
        return;
    }

    if (count && count > 0) {
        console.log(`Target test already has ${count} results. Skipping copy to avoid duplicates.`);
        return;
    }

    // 2. Fetch Source Data
    console.log('Fetching source data...');
    const { data: sourceData, error: fetchError } = await supabase
        .from('test_results')
        .select('*') // Select all columns
        .eq('test_id', SOURCE_TEST_ID);

    if (fetchError) {
        console.error('Fetch Source Error:', fetchError);
        return;
    }

    if (!sourceData || sourceData.length === 0) {
        console.log('No source data found.');
        return;
    }

    console.log(`Fetched ${sourceData.length} records.`);

    // 3. Prepare Payloads
    const batchSize = 50;
    const payloads = sourceData.map(row => {
        // Create a copy without ID (let DB generate new UUID) and with new Test ID
        const { id, ...rest } = row;
        return {
            ...rest,
            test_id: TARGET_TEST_ID,
            // Keep application_id, user_id, answers_log, detailed_scores same.
        };
    });

    // 4. Insert in Batches
    console.log(`Starting insertion of ${payloads.length} records...`);

    for (let i = 0; i < payloads.length; i += batchSize) {
        const batch = payloads.slice(i, i + batchSize);
        const { error: insertError } = await supabase
            .from('test_results')
            .insert(batch);

        if (insertError) {
            console.error(`Batch ${i} insert failed:`, insertError.message);
        } else {
            console.log(`Batch ${i} inserted successfully.`);
        }
    }

    console.log('Copy complete.');
}

copyData();
