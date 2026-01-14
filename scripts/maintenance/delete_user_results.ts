
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function deleteUserResults() {
    console.log("Searching for test 'NIS Customizing Test'...");
    const { data: tests } = await supabase.from('tests').select('id').ilike('title', '%NIS%Customizing%');
    const testId = tests?.[0]?.id;
    if (!testId) { console.error("Test not found"); return; }

    const userId = '343867c2-1f4f-4a82-b376-507def31a864'; // Confirmed test account ID

    console.log(`Deleting results for user ${userId} and test ${testId}...`);

    const { error, count } = await supabase
        .from('test_results')
        .delete({ count: 'exact' })
        .eq('test_id', testId)
        .eq('user_id', userId);

    if (error) {
        console.error("Deletion failed:", error);
    } else {
        console.log(`Deleted ${count} results successfully.`);
    }
}

deleteUserResults();
