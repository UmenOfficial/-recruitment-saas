
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkAndFixReverse() {
    console.log("Checking '자기신뢰도검증' questions...");

    // 1. Find Questions
    // We need to join test_questions to filter by NIS test if needed, or just search by category in 'questions' table?
    // Safer to find by Test ID first to be sure we are hitting the right questions (though questions are shared?)
    // Questions allow many-to-many. Let's look at questions table directly by category.

    // Find category name exactly
    // In previous steps we saw it as '자기신뢰도검증' or 'Scale_...'
    // Category in 'questions' table is usually the raw name.

    const { data: questions, error } = await supabase
        .from('questions')
        .select('id, content, category, is_reverse_scored')
        .ilike('category', '%자기신뢰도%');

    if (error) { console.error(error); return; }

    if (!questions || questions.length === 0) {
        console.log("No questions found matching '%자기신뢰도%'.");
        return;
    }

    console.log(`Found ${questions.length} questions.`);
    questions.forEach(q => {
        console.log(`[${q.id}] Rev: ${q.is_reverse_scored} | ${q.content.substring(0, 30)}...`);
    });

    // 2. Update to False
    console.log("\nDisabling reverse scoring...");
    const ids = questions.map(q => q.id);
    const { error: updateError } = await supabase
        .from('questions')
        .update({ is_reverse_scored: false })
        .in('id', ids);

    if (updateError) console.error("Update failed:", updateError);
    else console.log("Successfully disabled reverse scoring for all.");
}

checkAndFixReverse();
