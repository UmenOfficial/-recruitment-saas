
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function inspectAttempt2() {
    console.log("Searching for test 'NIS Customizing Test'...");
    const { data: tests } = await supabase.from('tests').select('id').ilike('title', '%NIS%Customizing%');
    const testId = tests?.[0]?.id;

    // Target user from previous step
    const userId = '343867c2-1f4f-4a82-b376-507def31a864';

    const { data: res } = await supabase
        .from('test_results')
        .select('*')
        .eq('test_id', testId)
        .eq('user_id', userId)
        .eq('attempt_number', 2)
        .single();

    if (!res) { console.log("Attempt 2 not found"); return; }

    console.log("Attempt 2 Answers Log Keys:", Object.keys(res.answers_log).length);
    console.log("Attempt 2 Answers Sample:", JSON.stringify(res.answers_log).slice(0, 200));
    console.log("Attempt 2 Total Score:", res.total_score);
    console.log("Attempt 2 Detailed Scores (Total):", res.detailed_scores?.total);
}

inspectAttempt2();
