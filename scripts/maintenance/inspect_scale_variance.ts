
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function inspectVariance() {
    console.log("Searching for test 'NIS Customizing Test'...");
    const { data: tests } = await supabase.from('tests').select('id').ilike('title', '%NIS%Customizing%');
    const testId = tests?.[0]?.id;
    if (!testId) { console.error("Test not found"); return; }

    // 1. Get Questions for '개방성'
    const { data: qData } = await supabase
        .from('test_questions')
        .select('questions(id, category, is_reverse_scored)')
        .eq('test_id', testId);

    const targetQuestions = qData
        ?.map((d: any) => d.questions)
        .filter((q: any) => q.category === '개방성') || [];

    if (targetQuestions.length === 0) { console.log("No questions found for '개방성'"); return; }
    console.log(`Found ${targetQuestions.length} questions for '개방성'.`);

    // 2. Fetch Results
    const { data: results } = await supabase
        .from('test_results')
        .select('answers_log')
        .eq('test_id', testId)
        .eq('attempt_number', 1)
        .limit(300);

    if (!results || results.length === 0) { console.log("No results found."); return; }

    // 3. Calculate Scores
    const scores: number[] = [];
    results.forEach((res: any) => {
        let sum = 0;
        targetQuestions.forEach((q: any) => {
            const raw = res.answers_log[q.id];
            if (typeof raw === 'number') {
                const val = q.is_reverse_scored ? (6 - raw) : raw;
                sum += val;
            }
        });
        scores.push(sum);
    });

    // 4. Calc Mean/SD
    const n = scores.length;
    const mean = scores.reduce((a, b) => a + b, 0) / n;
    const variance = scores.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / n; // Population Var? Or Sample? dividing by n for simple view
    const sd = Math.sqrt(variance);

    console.log(`\nAnalysis of ${n} users for '개방성':`);
    console.log(`Mean: ${mean.toFixed(5)}`);
    console.log(`SD: ${sd.toFixed(5)}`);
    console.log(`Min: ${Math.min(...scores)}`);
    console.log(`Max: ${Math.max(...scores)}`);
    console.log(`First 10 scores: ${scores.slice(0, 10).join(', ')}`);
}

inspectVariance();
