
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function clearNisNorms() {
    console.log("Searching for test 'NIS Customizing Test'...");

    // 1. Find Test
    const { data: tests } = await supabase.from('tests').select('id, title').ilike('title', '%NIS%Customizing%');
    const targetTest = tests?.[0];

    if (!targetTest) {
        console.error("Test 'NIS Customizing Test' not found.");
        return;
    }
    console.log(`Target Test: ${targetTest.title} (${targetTest.id})`);

    // 2. Delete Norms
    const { error, count } = await supabase
        .from('test_norms')
        .delete({ count: 'exact' })
        .eq('test_id', targetTest.id);

    if (error) {
        console.error("Error deleting norms:", error.message);
    } else {
        console.log(`Successfully deleted ${count} norms for ${targetTest.title}.`);
    }
}

clearNisNorms();
