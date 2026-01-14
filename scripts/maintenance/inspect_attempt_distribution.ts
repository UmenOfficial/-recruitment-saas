
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkDistribution() {
    console.log("Searching for test 'NIS Customizing Test'...");
    const { data: tests } = await supabase.from('tests').select('id').ilike('title', '%NIS%Customizing%');
    const testId = tests?.[0]?.id;
    if (!testId) { console.error("Test not found"); return; }

    const { data: results } = await supabase
        .from('test_results')
        .select('attempt_number')
        .eq('test_id', testId);

    if (!results) { console.log("No results found."); return; }

    const dist: Record<number, number> = {};
    results.forEach(r => {
        dist[r.attempt_number] = (dist[r.attempt_number] || 0) + 1;
    });

    console.log("\nAttempt Number Distribution:");
    Object.entries(dist).forEach(([att, count]) => {
        console.log(`- Attempt ${att}: ${count} records`);
    });
    console.log(`Total Records: ${results.length}`);
}

checkDistribution();
