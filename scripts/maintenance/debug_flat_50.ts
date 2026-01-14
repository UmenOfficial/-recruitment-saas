
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!; // Using Anon key as client, should work if RLS allows or use Service Role if blocked.
// For admin debugging, Service Role is better if available, but I'll try Anon first or assume environment has SERVICE_ROLE.
// Actually, local environment usually has `SUPABASE_SERVICE_ROLE_KEY`.
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function inspectUserResult() {
    const email = 'paycmh@gmail.com';
    console.log(`Finding user: ${email}`);

    const { data: user, error: userError } = await supabase
        .from('users')
        .select('id, email')
        .eq('email', email)
        .single();

    if (userError || !user) {
        console.error("User not found:", userError);
        return;
    }
    console.log(`User Found: ${user.id}`);

    const { data: results, error: resError } = await supabase
        .from('test_results')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

    if (resError) {
        console.error("Error fetching results:", resError);
        return;
    }

    if (!results || results.length === 0) {
        console.log("No test results found for user.");
        return;
    }

    console.log(`Found ${results.length} results.`);

    for (const r of results) {
        console.log(`\n--- Result ID: ${r.id} ---`);
        console.log(`Test ID: ${r.test_id}`);
        console.log(`Attempt: ${r.attempt_number}`);
        console.log(`Completed At: ${r.completed_at}`);
        console.log(`Total Score: ${r.total_score}`);
        console.log(`T-Score: ${r.t_score}`);

        console.log(`Detailed Scores (Keys):`, r.detailed_scores ? Object.keys(r.detailed_scores) : 'null');

        if (r.detailed_scores && r.detailed_scores.scales) {
            console.log("Scale Scores Sample:", JSON.stringify(r.detailed_scores.scales).slice(0, 200) + "...");
        }

        // Check Norms for this Test ID
        const { data: norms, error: normError } = await supabase
            .from('test_norms')
            .select('category_name, mean_value, std_dev_value')
            .eq('test_id', r.test_id);

        if (normError) {
            console.log("Error fetching norms:", normError.message);
        } else {
            console.log(`Norms Count for Test ${r.test_id}: ${norms?.length}`);
            if (norms && norms.length > 0) {
                console.log("Sample Norms:", norms.slice(0, 5));
                const scaleNorms = norms.filter(n => n.category_name.startsWith('Scale_'));
                const compNorms = norms.filter(n => n.category_name.startsWith('Comp_'));
                console.log(`Norms Breakdown - Scale_: ${scaleNorms.length}, Comp_: ${compNorms.length}, Others: ${norms.length - scaleNorms.length - compNorms.length}`);
            } else {
                console.warn("!!! NO NORMS FOUND FOR THIS TEST !!! This is likely the cause of Flat 50.");
            }
        }
    }
}

inspectUserResult();
