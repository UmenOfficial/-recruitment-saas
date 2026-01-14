
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function clearResults() {
    console.log("Clearing results for test_candidate@umen.cloud...");

    // 1. Get User
    const { data: user, error: uErr } = await supabase
        .from('users')
        .select('id, email')
        .eq('email', 'test_candidate@umen.cloud')
        .single();

    if (uErr || !user) {
        console.error("User not found:", uErr);
        return;
    }
    console.log(`User found: ${user.email} (${user.id})`);

    // 2. Delete Results
    const { error: delErr, count } = await supabase
        .from('test_results')
        .delete({ count: 'exact' })
        .eq('user_id', user.id);

    if (delErr) {
        console.error("Delete failed:", delErr);
    } else {
        console.log(`Successfully deleted ${count} test results.`);
    }
}

clearResults();
