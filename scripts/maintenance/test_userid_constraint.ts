
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function testUserIdUpdate() {
    console.log("Fetching one seeded result...");
    const { data: results } = await supabase
        .from('test_results')
        .select('id')
        .gte('attempt_number', 1000)
        .limit(1);

    if (!results || results.length === 0) { console.log("No seeded results found"); return; }

    const targetId = results[0].id;
    const randomUuid = crypto.randomUUID();

    console.log(`Attempting to update result ${targetId} with new user_id: ${randomUuid}`);

    const { error } = await supabase
        .from('test_results')
        .update({ user_id: randomUuid })
        .eq('id', targetId);

    if (error) {
        console.error("Update Failed (FK Constraint?):", error);
    } else {
        console.log("Update Successful! Random UUIDs are accepted.");
        // Revert to avoid phantom
        // await supabase.from('test_results').update({ user_id: ... }).eq('id', targetId);
    }
}

testUserIdUpdate();
