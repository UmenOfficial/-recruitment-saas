
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load env vars
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error("Missing Supabase credentials");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function deleteAdminTestData() {
    console.log("Deleting Admin Test Data...");

    const userId = '343867c2-1f4f-4a82-b376-507def31a864';

    // 1. Find the NIS test ID
    const { data: tests } = await supabase
        .from('tests')
        .select('id, title')
        .ilike('title', '%NIS Customizing%')
        .limit(1);

    if (!tests || tests.length === 0) {
        console.error("Could not find NIS Customizing Test");
        return;
    }
    const testId = tests[0].id;

    console.log(`Target User: ${userId}`);
    console.log(`Target Test: ${tests[0].title} (${testId})`);

    // 2. Perform Deletion
    const { count, error } = await supabase
        .from('test_results')
        .delete({ count: 'exact' })
        .eq('test_id', testId)
        .eq('user_id', userId);

    if (error) {
        console.error("Error deleting data:", error);
        return;
    }

    console.log(`Successfully deleted ${count} test results.`);
}

deleteAdminTestData();
