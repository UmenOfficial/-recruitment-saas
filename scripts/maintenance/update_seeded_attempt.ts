
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function fixAttempt() {
    console.log("Searching for test 'NIS Customizing Test'...");
    const { data: tests } = await supabase.from('tests').select('id').ilike('title', '%NIS%Customizing%');
    const testId = tests?.[0]?.id;
    if (!testId) { console.error("Test not found"); return; }

    // 1. Delete existing attempt=1 (noise)
    const { error: delError, count } = await supabase
        .from('test_results')
        .delete({ count: 'exact' })
        .eq('test_id', testId)
        .eq('attempt_number', 1);

    if (delError) console.error("Delete Error:", delError);
    else console.log(`Deleted ${count} existing noise records (attempt=1).`);

    // 2. Fetch seeded (attempt >= 1000)
    const { data: results } = await supabase
        .from('test_results')
        .select('id')
        .eq('test_id', testId)
        .gte('attempt_number', 1000);

    if (!results || results.length === 0) { console.log("No seeded data to update."); return; }
    console.log(`Updating ${results.length} seeded records to attempt_number = 1...`);

    // 3. Update in batches
    // Simple loop for safety/speed balance
    for (const r of results) {
        await supabase
            .from('test_results')
            .update({ attempt_number: 1 })
            .eq('id', r.id);
    }

    console.log("Update Complete. All seeded data is now attempt_number=1.");
}

fixAttempt();
