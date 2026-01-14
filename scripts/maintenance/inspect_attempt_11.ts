
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function inspectAttempt11() {
    console.log("Inspecting Attempt 11 pattern [2,3,3,4]...");

    // Get Result
    const { data: user } = await supabase.from('users').select('id').eq('email', 'test_candidate@umen.cloud').single();
    const { data: result } = await supabase
        .from('test_results')
        .select('*')
        .eq('user_id', user!.id)
        .eq('attempt_number', 11)
        .single();

    if (!result) { console.log("Attempt 11 not found"); return; }

    const scores = result.detailed_scores;
    console.log(`Total Score (DB): ${result.total_score}`);
    console.log(`Total Score (JSON): ${scores.total?.t_score}`);
    console.log(`Total Raw: ${scores.total?.raw}`);

    // Check a few competencies
    console.log("Competency Scores:");
    const comps = scores.competencies || {};
    const compKeys = Object.keys(comps).slice(0, 5);
    compKeys.forEach(k => {
        const c = comps[k];
        console.log(`  ${k}: T=${c.t_score} (Raw=${c.raw})`);
    });

    // Check Total Norm
    const { data: norms } = await supabase
        .from('test_norms')
        .select('*')
        .eq('test_id', result.test_id)
        .eq('category_name', 'TOTAL');

    if (norms && norms.length > 0) {
        const n = norms[0];
        console.log(`\nTotal Norm: Mean=${n.mean_value}, Std=${n.std_dev_value}`);
        const calc = 50 + 10 * ((scores.total.raw - n.mean_value) / n.std_dev_value);
        console.log(`Calculated Total T: ${calc}`);
    } else {
        console.log("Total Norm NOT FOUND in DB. Using Scale Sum?");
    }
}

inspectAttempt11();
