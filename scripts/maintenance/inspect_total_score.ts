
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkAttempt3Total() {
    console.log("Checking Attempt 3 Total Score...");

    // Get User
    const { data: user } = await supabase.from('users').select('id').eq('email', 'test_candidate@umen.cloud').single();

    const { data: result } = await supabase
        .from('test_results')
        .select('total_score, t_score, detailed_scores')
        .eq('user_id', user!.id)
        .eq('attempt_number', 3)
        .single();

    if (!result) { console.log("No result found"); return; }

    console.log("DB Columns:");
    console.log(`  total_score: ${result.total_score} (Type: ${typeof result.total_score})`);
    console.log(`  t_score: ${result.t_score}`);

    const jsonTotal = result.detailed_scores?.total;
    console.log("JSON Detailed:");
    console.log(`  raw: ${jsonTotal?.raw}`);
    console.log(`  t_score: ${jsonTotal?.t_score}`);

    console.log("Competencies:");
    const comps = result.detailed_scores?.competencies || {};
    Object.entries(comps).forEach(([k, v]: any) => {
        console.log(`  ${k}: T=${v.t_score} (Raw=${v.raw})`);
    });
}

checkAttempt3Total();
