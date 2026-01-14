
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkReverse() {
    console.log("Searching for test 'NIS Customizing Test'...");
    const { data: tests } = await supabase.from('tests').select('id, title').ilike('title', '%NIS%Customizing%');
    const targetTest = tests?.[0];
    if (!targetTest) { console.error("Test not found"); return; }
    console.log(`Target: ${targetTest.title}`);

    const { data: qData } = await supabase
        .from('test_questions')
        .select(`
            questions (
                id,
                content,
                category,
                is_reverse_scored
            )
        `)
        .eq('test_id', targetTest.id);

    if (!qData) return;

    const reverseQuestions = qData
        .map((d: any) => d.questions)
        .filter((q: any) => q.is_reverse_scored);

    console.log(`\nTotal Reverse Scored Questions: ${reverseQuestions.length}`);

    // Group by Category to be helpful
    const byCat: Record<string, number> = {};
    reverseQuestions.forEach((q: any) => {
        byCat[q.category] = (byCat[q.category] || 0) + 1;
    });

    console.log("By Category:");
    Object.entries(byCat).forEach(([cat, count]) => {
        console.log(`- ${cat}: ${count}`);
    });
}

checkReverse();
