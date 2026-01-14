
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { calculatePersonalityScores } from '../lib/scoring';

// Load env vars
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error("Missing Supabase credentials");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function simulateScoring() {
    console.log("Simulating Scoring for NIS Customizing Test...");

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

    // 2. Fetch necessary metadata
    const GLOBAL_TEST_ID = '8afa34fb-6300-4c5e-bc48-bbdb74c717d8';

    const [globalNormsResult, localNormsResult, competenciesResult, questionsResult] = await Promise.all([
        supabase.from('test_norms').select('*').eq('test_id', GLOBAL_TEST_ID),
        supabase.from('test_norms').select('*').eq('test_id', testId),
        supabase.from('competencies').select('id, name, competency_scales ( scale_name )').eq('test_id', testId),
        supabase.from('test_questions').select('questions ( id, category, content )').eq('test_id', testId)
    ]);

    const norms = [...(globalNormsResult.data || []), ...(localNormsResult.data || [])];
    const competencies = competenciesResult.data || [];
    const questions = questionsResult.data?.map((q: any) => ({
        id: q.questions.id,
        category: q.questions.category,
        content: q.questions.content
    })) || [];

    if (questions.length === 0) {
        console.error("No questions found for this test.");
        return;
    }

    // 3. Prepare Norms & Competencies for lib function
    const scaleNorms = norms
        .filter((n: any) => n.category_name.startsWith('Scale_'))
        .map((n: any) => ({
            category_name: n.category_name.replace('Scale_', ''),
            mean_value: n.mean_value,
            std_dev_value: n.std_dev_value
        }));

    const competencyNorms = norms
        .filter((n: any) => n.category_name.startsWith('Comp_'))
        .map((n: any) => ({
            category_name: n.category_name.replace('Comp_', ''),
            mean_value: n.mean_value,
            std_dev_value: n.std_dev_value
        }));

    const compList = competencies.map((c: any) => ({
        name: c.name,
        competency_scales: c.competency_scales
    }));

    console.log(`\nLoaded: ${questions.length} questions, ${scaleNorms.length} scale norms, ${competencyNorms.length} comp norms.`);

    // 4. Simulate Answers (All 3s)
    // Likert scale often 1-5 or 1-6. Assuming 1-5, midi is 3. 
    console.log("\n--- Simulation Case 1: All Answers = 3 (Middle) ---");

    const answersMap1: Record<string, number> = {};
    questions.forEach(q => answersMap1[q.id] = 3);

    const result1 = calculatePersonalityScores(
        answersMap1,
        questions,
        scaleNorms,
        competencyNorms,
        compList
    );

    printResult(result1);

    // 5. Simulate Answers (Random within 1-5)
    console.log("\n--- Simulation Case 2: Random Answers (1-6) ---");
    const answersMap2: Record<string, number> = {};
    questions.forEach(q => answersMap2[q.id] = Math.floor(Math.random() * 6) + 1);

    const result2 = calculatePersonalityScores(
        answersMap2,
        questions,
        scaleNorms,
        competencyNorms,
        compList
    );

    printResult(result2);

}

function printResult(result: any) {
    console.log("Total T-Score:", result.total.t_score.toFixed(1));
    console.log("Competency Scores (T-Score):");
    Object.entries(result.competencies).forEach(([name, score]: [string, any]) => {
        console.log(`  - ${name}: Raw=${score.raw}, T=${score.t_score.toFixed(1)}`);
    });
    console.log("Scale Scores (First 5):");
    Object.entries(result.scales).slice(0, 5).forEach(([name, score]: [string, any]) => {
        console.log(`  - ${name}: Raw=${score.raw}, T=${score.t_score.toFixed(1)}`);
    });
}

simulateScoring();
