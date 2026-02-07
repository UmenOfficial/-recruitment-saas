
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

async function checkTestData() {
    console.log("Checking latest test info...");

    // 1. Get the specific aptitude test result
    const targetTestId = '7477d102-4717-4d6d-9ee7-942371a7c92c';
    const { data: latestResult, error: rError } = await supabase
        .from('test_results')
        .select(`
            id, 
            test_id, 
            started_at, 
            updated_at, 
            completed_at, 
            answers_log,
            tests (title)
        `)
        .eq('test_id', targetTestId)
        .order('updated_at', { ascending: false })
        .limit(1)
        .single();

    if (rError) {
        console.error("Error fetching latest result:", rError);
        return;
    }

    console.log("\nLatest Test Result:");
    console.log(JSON.stringify(latestResult, null, 2));

    const testId = latestResult.test_id;

    // 2. Check questions for this test
    const { data: questions, error: qError } = await supabase
        .from('test_questions')
        .select(`
            id,
            order_index,
            questions (id, content)
        `)
        .eq('test_id', testId);

    if (qError) {
        console.error("Error fetching questions:", qError);
    } else {
        console.log(`\nFound ${questions.length} questions for Test ID: ${testId}`);
        // Check 1 question with ALL fields
        const { data: sampleQ } = await supabase
            .from('questions')
            .select('*')
            .eq('id', (questions[0].questions as any).id)
            .single();

        console.log("\nSample Question Full Data:");
        console.log(JSON.stringify(sampleQ, null, 2));
    }

    // 3. FORCE RESET for Debugging
    console.log("\nRe-opening test session...");
    const { error: updateError } = await supabase
        .from('test_results')
        .update({
            completed_at: null,
            started_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            answers_log: {} // clear answers too? maybe
        })
        .eq('id', latestResult.id);

    if (updateError) {
        console.error("Failed to reset:", updateError);
    } else {
        console.log("Successfully reset completed_at to null. User can now access the test.");
    }
}

checkTestData();
