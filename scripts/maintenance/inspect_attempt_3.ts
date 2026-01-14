
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function inspectAttempt3() {
    console.log("Inspecting Attempt 3 (All 3s)...");

    // 1. Get Result
    const { data: user } = await supabase.from('users').select('id').eq('email', 'test_candidate@umen.cloud').single();
    const { data: result } = await supabase
        .from('test_results')
        .select('*')
        .eq('user_id', user!.id)
        .eq('attempt_number', 3)
        .single();

    if (!result) {
        console.error("Attempt 3 not found.");
        return;
    }

    const scores = result.detailed_scores;
    // Pick a few scales to analyze (e.g. from user screenshot or random)
    // User mentioned "Bottom 4" had 23.1, 25.1. Let's find those.

    // Sort scales by T-score
    const scales = Object.entries(scores.scales).map(([k, v]: any) => ({
        key: k,
        t: v.t_score,
        raw: v.raw
    })).sort((a, b) => a.t - b.t);

    console.log("Bottom 5 Scales in Attempt 3:");
    const bottom5 = scales.slice(0, 5);
    console.table(bottom5);

    // 2. Fetch Norms for these 5
    const names = bottom5.map(s => s.key);
    // Note: Norms might have prefix 'Scale_'
    const { data: norms } = await supabase
        .from('test_norms')
        .select('*')
        .eq('test_id', result.test_id)
        .in('category_name', names.flatMap(n => [n, `Scale_${n}`]));

    console.log("\n--- Verification ---");
    bottom5.forEach(s => {
        // Find norm
        const n = norms?.find(nm => nm.category_name === s.key || nm.category_name === `Scale_${s.key}`);
        if (!n) {
            console.log(`[${s.key}] Norm NOT FOUND`);
            return;
        }

        const calculated = 50 + 10 * ((s.raw - n.mean_value) / n.std_dev_value);
        console.log(`[${s.key}]`);
        console.log(`  Raw: ${s.raw}`);
        console.log(`  Norm Mean: ${n.mean_value} (Avg/Item: ${(n.mean_value / (s.raw / 3)).toFixed(2)} assuming 3.0 answer?) Wait, raw is sum.`);
        console.log(`  Norm Std: ${n.std_dev_value}`);
        console.log(`  Calc T: ${calculated.toFixed(4)}`);
        console.log(`  Stored T: ${s.t}`);
        console.log(`  Match? ${Math.abs(calculated - s.t) < 0.01 ? 'YES' : 'NO'}`);
    });
}

inspectAttempt3();
