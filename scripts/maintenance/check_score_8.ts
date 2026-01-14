
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkScore8() {
    const { data: user } = await supabase.from('users').select('id').eq('email', 'test_candidate@umen.cloud').single();
    if (!user) return;

    const { data: result } = await supabase
        .from('test_results')
        .select('*')
        .eq('user_id', user.id)
        .eq('attempt_number', 6)
        .single();

    if (result) {
        console.log(`Checking Attempt 6 (Total ${result.total_score})...`);
        const scales = result.detailed_scores.scales;

        let found = false;
        Object.entries(scales).forEach(([k, v]: any) => {
            if (v.t_score >= 7.5 && v.t_score <= 8.5) { // Check range for rounding
                console.log(`FOUND 8.0? -> ${k}: ${v.t_score}`);
                found = true;
            }
        });

        if (!found) console.log("No score between 7.5 and 8.5 found.");

    } else {
        console.log("Attempt 6 not found.");
    }
}

checkScore8();
