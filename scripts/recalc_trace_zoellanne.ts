
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { calculatePersonalityScores, ScoringQuestion, ScoringNorm, ScoringCompetency } from '../lib/scoring';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
const TARGET_EMAIL = 'zoellanne44@gmail.com';
const GLOBAL_TEST_ID = '8afa34fb-6300-4c5e-bc48-bbdb74c717d8';

async function traceRecalc() {
    console.log(`--- Tracing Recalc for ${TARGET_EMAIL} ---`);

    // 1. Get User
    const { data: users } = await supabase.from('users').select('id').eq('email', TARGET_EMAIL).single();
    if (!users) return console.log('User not found');
    const userId = users.id;

    // 2. Get Result
    const { data: results } = await supabase.from('test_results').select('*').eq('user_id', userId).order('completed_at', { ascending: false }).limit(1);
    const res = results?.[0];
    if (!res) return console.log('Result not found');

    const testId = res.test_id;
    console.log(`Test ID: ${testId}`);

    // 3. Get Questions
    const { data: testQs } = await supabase
        .from('test_questions')
        .select('order_index, questions ( id, category, content, is_reverse_scored )')
        .eq('test_id', testId)
        .order('order_index');

    const questionsList: ScoringQuestion[] = testQs!.map(tq => ({
        id: tq.questions.id,
        category: tq.questions.category
    })) as any;

    console.log(`Loaded ${questionsList.length} questions.`);
    // Debug: Check if '반사회적 성격장애' questions exist in this list
    const antiSocialQs = questionsList.filter(q => q.category.includes('반사회'));
    console.log(`'반사회적 성격장애' Questions Count: ${antiSocialQs.length}`);
    antiSocialQs.forEach(q => console.log(` - [${q.id}] ${q.category}`));

    // 4. Get Norms
    const { data: globalNormsRaw } = await supabase.from('test_norms').select('*').eq('test_id', GLOBAL_TEST_ID);
    const scaleNorms: ScoringNorm[] = (globalNormsRaw || [])
        .filter((n: any) => n.category_name.startsWith('Scale_'))
        .map((n: any) => ({
            category_name: n.category_name.replace('Scale_', ''),
            mean_value: n.mean_value,
            std_dev_value: n.std_dev_value
        }));

    const antiNorm = scaleNorms.find(n => n.category_name.includes('반사회'));
    console.log('Norm for Antisocial:', antiNorm);

    // 5. Parse Answers
    let answers: Record<string, number> = {};
    const log = res.answers_log as any;
    console.log('Answers Log Keys Sample:', Object.keys(log).slice(0, 5));

    // Logic from recalc_all_scores.ts
    if (typeof log === 'object' && log !== null) {
        // Index based map
        Object.entries(log).forEach(([idxStr, val]) => {
            // Try to see if key is UUID or Index
            if (idxStr.length > 20) {
                // UUID Key
                // Assume DB val is 0-4 (Index) -> +1
                const qId = idxStr;
                const qData = questionsList.find(q => q.id === qId);
                if (qData) {
                    let raw = (typeof val === 'number' ? val : parseInt(val as string)) + 1;
                    // Handle reverse check MANUALLY here as questionsList above lost 'is_reverse_scored' in mapping?
                    // Wait, questionsList in trace definition above ONLY has id, category.
                    // We need is_reverse_scored from testQs.
                    const originQ = testQs!.find(tq => tq.questions.id === qId)?.questions;
                    if (originQ?.is_reverse_scored) {
                        raw = 6 - raw;
                    }
                    answers[qId] = raw;
                }
            } else {
                // Index Key
                const idx = parseInt(idxStr);
                const qData = testQs![idx];
                if (qData) {
                    let raw = (typeof val === 'number' ? val : parseInt(val as string)) + 1;
                    if (qData.questions.is_reverse_scored) {
                        raw = 6 - raw;
                    }
                    answers[qData.questions.id] = raw;
                }
            }
        });
    }

    console.log(`Parsed Answers Count: ${Object.keys(answers).length}`);

    // Check Antisocial Answers specifically
    let antiRawSum = 0;
    antiSocialQs.forEach(q => {
        const val = answers[q.id];
        console.log(` Q [${q.id}]: User Answer = ${val}`);
        if (val) antiRawSum += val;
    });
    console.log(`Calculated Manual Raw Sum for Antisocial: ${antiRawSum}`);

    // 6. Run Calculation
    const details = calculatePersonalityScores(
        answers,
        questionsList,
        scaleNorms,
        [], // Empty comps
        [] // Empty comps list
    );

    const antiResult = details.scales['반사회적 성격장애'];
    console.log('Calculated Result:', antiResult);
}

traceRecalc();
