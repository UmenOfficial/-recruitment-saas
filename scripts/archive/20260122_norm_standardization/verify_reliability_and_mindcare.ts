
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

// --- Logic from ReliabilityAnalysis.tsx ---
const EXCLUDED_SCALES = [
    '지시불이행', '거짓말', '자기신뢰도검증', '공격성', '의존성 성격장애',
    '편접성 성격장애', '편집성 성격장애', '불안/우울 장애', '조현형성격장애', '조현형 성격장애', '반사회적 성격장애', '경계선 성격장애'
];

interface Question {
    id: string;
    category: string;
    content: string;
}

function checkReliability(questions: Question[], answers: Record<string, number>) {
    const flags: string[] = [];

    // 1. Std Dev
    const validStdDevItems = questions.filter(q => !EXCLUDED_SCALES.includes(q.category));
    const stdDevScores = validStdDevItems.map(q => answers[q.id]).filter(s => s !== undefined);
    if (stdDevScores.length > 1) {
        const mean = stdDevScores.reduce((a, b) => a + b, 0) / stdDevScores.length;
        const variance = stdDevScores.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / (stdDevScores.length - 1);
        const stdDev = Math.sqrt(variance);
        if (stdDev <= 0.5) flags.push(`Low StdDev (${stdDev.toFixed(2)})`);
    }

    // 2. Social Desirability
    const validSocialItems = questions.filter(q => !EXCLUDED_SCALES.includes(q.category));
    if (validSocialItems.length > 0) {
        const highScores = validSocialItems.filter(q => (answers[q.id] || 0) >= 5).length;
        if ((highScores / validSocialItems.length) >= 0.5) flags.push('Social Desirability');
    }

    // 3. Lie Scale
    const lieItems = questions.filter(q => q.category === '거짓말');
    if (lieItems.filter(q => (answers[q.id] || 0) >= 4).length >= 3) flags.push('Lie Scale');

    // 4. Non-Compliance
    const ncItems = questions.filter(q => q.category === '지시불이행');
    let mismatchCount = 0;
    ncItems.forEach(q => {
        const ans = answers[q.id];
        if (ans === undefined) return;
        let target = -1;
        if (q.content.includes("'매우 그렇다'")) target = 5;
        else if (q.content.includes("'그렇다'")) target = 4;
        else if (q.content.includes("'보통'") || q.content.includes("'보통이다'")) target = 3;
        else if (q.content.includes("'전혀 그렇지 않다'")) target = 1;
        else if (q.content.includes("'그렇지 않다'")) target = 2;

        if (target !== -1 && ans !== target) mismatchCount++;
    });
    if (mismatchCount >= 2) flags.push(`Non-Compliance (${mismatchCount})`);

    // 5. Self-Validation
    const svItems = questions.filter(q => q.category === '자기신뢰도검증');
    if (svItems.filter(q => (answers[q.id] || 0) >= 4).length >= 3) flags.push('Self-Validation');

    return flags;
}

// --- Logic from MindCareAnalysis.tsx ---
const MIND_CARE_KEYS = [
    '불안/우울 장애', '불안/우울장애',
    '공격성',
    '조현형성격장애', '조현형 성격장애',
    '반사회적 성격장애',
    '경계선 성격장애',
    '의존성 성격장애',
    '편접성 성격장애', '편집성 성격장애'
];

function checkMindCare(detailedScores: any) {
    const flags: string[] = [];
    const scales = detailedScores.scales || {};

    MIND_CARE_KEYS.forEach(key => {
        const val = scales[key];
        if (val) {
            const t = val.t_score ?? val;
            if (t >= 65) flags.push(`${key} (${t})`);
        }
    });
    return flags;
}

async function verifyAll() {
    console.log('--- Verifying Reliability & Mind Care Logic (Recent 20 Users) ---\n');

    // 1. Get Questions for mapping
    // Assuming mostly NIS test
    const { data: tests } = await supabase.from('tests').select('id, title').ilike('title', '%NIS%').limit(1);
    const nisId = tests?.[0]?.id;

    if (!nisId) return console.log('NIS Test not found');

    const { data: qData } = await supabase
        .from('test_questions')
        .select('questions(id, category, content)')
        .eq('test_id', nisId)
        .order('id');

    const questions = qData?.map((l: any) => l.questions) || [];
    console.log(`Loaded ${questions.length} questions for simulation.\n`);

    // 2. Get Results
    const { data: results, error } = await supabase
        .from('test_results')
        .select(`
            id, answers_log, detailed_scores, 
            user_id,
            completed_at
        `)
        .order('completed_at', { ascending: false })
        .limit(20);

    if (error) console.error(error);
    if (!results) return;

    for (const res of results) {
        const name = res.user_id || 'Unknown';
        const answersIdx = res.answers_log || {};

        // Map answers keys (Index -> UUID) if needed, or if keys are already UUIDs check
        let finalAnswers: Record<string, number> = {};
        const keys = Object.keys(answersIdx);
        if (keys.length > 0 && keys[0].length > 10) {
            finalAnswers = answersIdx; // UUID keys
        } else {
            // Map index to Q ID
            questions.forEach((q: any, idx: number) => {
                const val = answersIdx[String(idx)];
                if (val !== undefined) finalAnswers[q.id] = val;
            });
        }

        // Reliability Check
        const relFlags = checkReliability(questions, finalAnswers);

        // Mind Care Check
        const mcFlags = checkMindCare(res.detailed_scores || {});

        console.log(`[User: ${name}]`);
        if (relFlags.length === 0) console.log(`  - Reliability: PASS`);
        else console.log(`  - Reliability: FAIL -> ${relFlags.join(', ')}`);

        if (mcFlags.length === 0) console.log(`  - Mind Care: PASS`);
        else console.log(`  - Mind Care: WARNING -> ${mcFlags.join(', ')}`);
        console.log('');
    }
}

verifyAll();
