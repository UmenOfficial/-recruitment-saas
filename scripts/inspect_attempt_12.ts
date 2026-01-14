
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
const USER_ID = '343867c2-1f4f-4a82-b376-507def31a864';
const ATTEMPT_NUM = 12;

async function inspect() {
    console.log(`Inspecting Attempt ${ATTEMPT_NUM} for 0.0 Score...`);

    // 1. Get Test ID
    const { data: tests } = await supabase.from('tests').select('id').ilike('title', '%NIS Customizing%').limit(1);
    const testId = tests![0].id;

    // 2. Fetch Result
    const { data: results } = await supabase.from('test_results')
        .select('*')
        .eq('user_id', USER_ID)
        .eq('test_id', testId)
        .eq('attempt_number', ATTEMPT_NUM)
        .single();

    if (!results) return console.log("Result not found.");

    console.log(`- Total T-Score: ${results.total_score}`);

    // 3. Analyze Detailed Scores
    const details = results.detailed_scores;
    const totalRaw = details.total.raw;
    const totalT = details.total.t_score;

    console.log(`- Raw Total Sum: ${totalRaw}`);
    console.log(`- Calculated T: ${totalT}`);

    console.log("\n[Breakdown by Competency]");
    const comps = details.competencies;
    Object.entries(comps).forEach(([name, val]: [string, any]) => {
        console.log(`  - ${name}: Raw=${val.raw}, T=${val.t_score.toFixed(2)}`);
    });

    // 4. Check Scale Scores
    console.log("\n[Scale Scores Check]");
    const scales = details.scales;
    let minT = 100, maxT = 0;
    Object.entries(scales).forEach(([name, val]: [string, any]) => {
        if (val.t_score < minT) minT = val.t_score;
        if (val.t_score > maxT) maxT = val.t_score;
    });
    console.log(`  - Min Scale T: ${minT.toFixed(2)}`);
    console.log(`  - Max Scale T: ${maxT.toFixed(2)}`);

    // 5. Why 0?
    // Formula: T = 50 + 10 * (Raw - Mean) / Std
    // If T <= 0, then (Raw - Mean) / Std <= -5.
    // Raw <= Mean - 5*Std.

    // Let's check Total Norm used implicitly or explicitly.
    // Logic: Total T is calculated from Total Raw (Sum of Comp T-Scores).
    // Wait, Comp T-Scores are around 50 usually.
    // If Comp T-scores are very low, Total Raw is low.

    // Let's look at Scale Raw inputs.
    const answers = results.answers_log;
    let sumInputs = 0;
    let count = 0;
    Object.values(answers).forEach((v: any) => {
        if (typeof v === 'number') {
            sumInputs += v;
            count++;
        }
    });
    console.log(`\n- Answer Stats: Avg Input = ${(sumInputs / count).toFixed(2)} (Count: ${count})`);
}

inspect();
