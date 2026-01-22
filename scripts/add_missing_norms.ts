
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

const GLOBAL_TEST_ID = '8afa34fb-6300-4c5e-bc48-bbdb74c717d8';

async function addMissingNorms() {
    console.log('--- Adding Missing Norms from Global Standards ---\n');

    // 1. Fetch Global Norms (Scale_ only)
    const { data: globalNorms } = await supabase
        .from('test_norms')
        .select('*')
        .eq('test_id', GLOBAL_TEST_ID)
        .like('category_name', 'Scale_%');

    if (!globalNorms || globalNorms.length === 0) {
        console.error('Failed to fetch Global Norms.');
        return;
    }
    console.log(`Loaded ${globalNorms.length} Global Scales.`);

    // 2. Target Tests
    const { data: tests } = await supabase.from('tests').select('id, title').ilike('title', '%NIS%');
    if (!tests || tests.length === 0) return;

    for (const test of tests) {
        console.log(`\nProcessing Target: ${test.title}`);

        // Get Existing to avoid duplicates
        const { data: existing } = await supabase
            .from('test_norms')
            .select('category_name')
            .eq('test_id', test.id);

        const existingSet = new Set(existing?.map(n => n.category_name));
        const toInsert: any[] = [];

        globalNorms.forEach(g => {
            // Check if exists (assuming strict match including Scale_ prefix)
            // Note: DB fix applied 'Scale_' to existing ones already.
            // Global norms also have 'Scale_' prefix.
            if (!existingSet.has(g.category_name)) {
                toInsert.push({
                    test_id: test.id,
                    category_name: g.category_name, // 'Scale_...'
                    mean_value: g.mean_value,
                    std_dev_value: g.std_dev_value
                });
            }
        });

        if (toInsert.length > 0) {
            console.log(`  Inserting ${toInsert.length} missing norms...`);
            const { error } = await supabase.from('test_norms').insert(toInsert);
            if (error) console.error('  Insert Error:', error.message);
            else console.log('  Success.');
        } else {
            console.log('  No missing norms to add.');
        }
    }
}

addMissingNorms();
