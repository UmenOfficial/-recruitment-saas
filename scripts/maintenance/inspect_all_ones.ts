
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function inspectAllOneResult() {
    // We know 'test_candidate@umen.cloud' user.
    // The "All 1" scenario was the FIRST one processed in the batch (Attempt 6, or close).
    // Let's find the result with total_score or attempt_number corresponding to the batch.

    // We can just fetch the recent results and look for the one with "All 1" pattern.
    // But easier to search by attempt_number if I knew it derived from 6.
    // I'll grab the last 20 results for this user and print summary.

    const { data: user } = await supabase.from('users').select('id').eq('email', 'test_candidate@umen.cloud').single();
    if (!user) return;

    const { data: results } = await supabase
        .from('test_results')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(15);

    console.log(`Found ${results?.length} results.`);

    // Look for the one with mostly 0s or very low scores.
    // User said "6회차" (Attempt 6).
    const target = results?.find(r => r.attempt_number === 6); // Or check Attempt 6 explicitly

    if (target) {
        console.log(`\n--- Attempt ${target.attempt_number} (Target) ---`);
        console.log(`Total Score: ${target.total_score}`);

        const scales = target.detailed_scores.scales;
        const comps = target.detailed_scores.competencies;

        console.log("Competencies:");
        Object.entries(comps).forEach(([k, v]: any) => console.log(`- ${k}: ${v.t_score}`));

        console.log("\nScales (All):");
        Object.entries(scales).forEach(([k, v]: any) => {
            console.log(`- ${k}: T=${v.t_score} (Raw=${v.raw})`);
        });

    } else {
        console.log("Attempt 6 not found in last 15.");
        results?.forEach(r => console.log(`- Attempt ${r.attempt_number}: Total ${r.total_score}`));
    }
}

inspectAllOneResult();
