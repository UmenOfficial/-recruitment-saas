
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
const USER_ID = '343867c2-1f4f-4a82-b376-507def31a864';

const EXCLUDED_SCALES = [
    '지시불이행', '거짓말', '자기신뢰도검증', '공격성', '의존성 성격장애',
    '편접성 성격장애', '불안/우울 장애', '조현형성격장애', '반사회적 성격장애', '경계선 성격장애'
];

const MIND_CARE_SCALES = [
    '불안/우울 장애', '공격성', '조현형성격장애', '반사회적 성격장애',
    '경계선 성격장애', '의존성 성격장애', '편접성 성격장애'
];

// Reliability Check Logic Copied/Adapted from ReportContent
function checkReliability(questions: any[], answers: Record<string, number>) {
    console.log("\n--- Reliability Analysis Check ---");

    // 1. StdDev
    const validStdDevItems = questions.filter(q => !EXCLUDED_SCALES.includes(q.category));
    const stdDevScores = validStdDevItems.map(q => answers[q.id]).filter(s => s !== undefined);
    if (stdDevScores.length > 1) {
        const mean = stdDevScores.reduce((a, b) => a + b, 0) / stdDevScores.length;
        const variance = stdDevScores.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / (stdDevScores.length - 1);
        const stdDev = Math.sqrt(variance);
        console.log(`1. StdDev: ${stdDev.toFixed(4)} (Threshold <= 0.5 for WARNING) -> ${stdDev <= 0.5 ? 'WARNING' : 'PASS'}`);
    } else {
        console.log("1. StdDev: Not enough items");
    }

    // 2. Social Desirability
    const validSocialItems = questions.filter(q => !EXCLUDED_SCALES.includes(q.category));
    if (validSocialItems.length > 0) {
        const highScores = validSocialItems.filter(q => (answers[q.id] || 0) >= 5).length;
        const ratio = highScores / validSocialItems.length;
        console.log(`2. Social Desirability: Ratio ${ratio.toFixed(2)} (${highScores}/${validSocialItems.length}) (Threshold >= 0.5 for WARNING) -> ${ratio >= 0.5 ? 'WARNING' : 'PASS'}`);
    }

    // 3. Lie Scale
    const lieItems = questions.filter(q => q.category === '거짓말');
    console.log(`3. Lie Scale Items: ${lieItems.length}`);
    if (lieItems.length > 0) {
        const lieCount = lieItems.filter(q => (answers[q.id] || 0) >= 4).length;
        console.log(`   High Score Count: ${lieCount} (Threshold >= 3 for WARNING) -> ${lieCount >= 3 ? 'WARNING' : 'PASS'}`);
    }

    // 4. Non-Compliance
    const ncItems = questions.filter(q => q.category === '지시불이행');
    console.log(`4. Non-Compliance Items: ${ncItems.length}`);
    if (ncItems.length > 0) {
        let mismatchCount = 0;
        ncItems.forEach(q => {
            // Logic from UI: check content for specific direction
            let target = -1;
            if (q.content.includes("'매우 그렇다'")) target = 5;
            else if (q.content.includes("'그렇다'")) target = 4;
            else if (q.content.includes("'보통'")) target = 3;
            else if (q.content.includes("'전혀 그렇지 않다'")) target = 1;
            else if (q.content.includes("'그렇지 않다'")) target = 2;

            const ans = answers[q.id];
            const match = ans === target;
            if (target !== -1 && !match) mismatchCount++;
            console.log(`   - "${q.content.substring(0, 20)}..." Target=${target}, Answer=${ans} -> ${match ? 'MATCH' : 'MISMATCH'}`);
        });
        console.log(`   Mismatch Count: ${mismatchCount} (Threshold >= 2 for WARNING) -> ${mismatchCount >= 2 ? 'WARNING' : 'PASS'}`);
    }

    // 5. Self-Validation
    const svItems = questions.filter(q => q.category === '자기신뢰도검증');
    console.log(`5. Self-Validation Items: ${svItems.length}`);
    if (svItems.length > 0) {
        const svCount = svItems.filter(q => (answers[q.id] || 0) >= 4).length;
        console.log(`   High Score Count: ${svCount} (Threshold >= 3 for WARNING) -> ${svCount >= 3 ? 'WARNING' : 'PASS'}`);
    }
}

async function analyze() {
    console.log("Fetching Latest Admin Result...");

    // 1. Get Test ID
    const { data: tests } = await supabase.from('tests').select('id').ilike('title', '%NIS Customizing%').limit(1);
    const testId = tests![0].id;

    // 2. Fetch Questions
    const { data: qData } = await supabase.from('test_questions')
        .select('questions(id, category, content, is_reverse_scored)')
        .eq('test_id', testId);

    const questions = qData?.map((r: any) => r.questions) || [];

    // 3. Fetch Latest Result
    const { data: results } = await supabase.from('test_results')
        .select('*')
        .eq('user_id', USER_ID)
        .eq('test_id', testId)
        .order('completed_at', { ascending: false })
        .limit(1);

    if (!results || results.length === 0) return console.log("No results found.");
    const r = results[0];

    console.log(`Analying Result ID: ${r.id}, Attempt: ${r.attempt_number}`);
    console.log(`Questions Order Present? ${!!r.questions_order}`);
    if (!r.questions_order) console.log("!! ALERT: 'questions_order' is MISSING. This causes the UI Report Render Bug. !!");

    // Reconstruct Answers
    // answers_log is Key(UUID) -> Value(Input 1-5)
    // DetailedScores uses T-Scores.
    const answers = r.answers_log || {};

    // We need to parse values as numbers
    const parsedAnswers: Record<string, number> = {};
    Object.entries(answers).forEach(([k, v]) => {
        if (k === 'scoring_breakdown') return;
        const num = Number(v);
        // Reliability check uses INPUT values or CONVERTED? 
        // UI Code: answers[q.id]. passed as `idKeyedAnswers`.
        // CandidatesPage passes `result.answers_log`.
        // So it uses RAW INPUTS (1-5).
        parsedAnswers[k] = num;
    });

    // A. Reliability
    checkReliability(questions, parsedAnswers);

    // B. Mind Care
    console.log("\n--- Mind Care Analysis Check ---");
    const scales = r.detailed_scores?.scales || {};

    MIND_CARE_SCALES.forEach(key => {
        const s = scales[key];
        if (!s) {
            console.log(`- ${key}: Not Found in scores`);
            return;
        }
        const tScore = s.t_score;
        const status = tScore >= 65 ? 'FAIL (WARNING)' : 'PASS';
        console.log(`- ${key}: T-Score ${tScore.toFixed(1)} -> ${status}`);
    });
}

analyze();
