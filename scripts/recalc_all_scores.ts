
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { calculatePersonalityScores } from '../lib/scoring';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl!, supabaseServiceKey!);

const GLOBAL_TEST_ID = '8afa34fb-6300-4c5e-bc48-bbdb74c717d8';

async function main() {
    console.log('Starting Batch Recalculation of Personality Scores...');

    // 1. Fetch All Personality Tests
    const { data: personalityTests } = await supabase
        .from('tests')
        .select('id')
        .eq('type', 'PERSONALITY');

    if (!personalityTests || personalityTests.length === 0) {
        console.log('No personality tests found.');
        return;
    }

    const testIds = personalityTests.map(t => t.id);
    console.log(`Found ${testIds.length} personality test types:`, testIds);

    // 2. Fetch Global Norms (Scale)
    const { data: globalNormsRaw } = await supabase
        .from('test_norms')
        .select('*')
        .eq('test_id', GLOBAL_TEST_ID);

    const scaleNorms = (globalNormsRaw || [])
        .filter((n: any) => n.category_name.startsWith('Scale_'))
        .map((n: any) => ({
            category_name: n.category_name.replace('Scale_', ''),
            mean_value: n.mean_value,
            std_dev_value: n.std_dev_value
        }));

    console.log(`Loaded ${scaleNorms.length} Global Scale Norms.`);

    // 3. Process Per Test Type
    for (const testId of testIds) {
        console.log(`\nProcessing Test ID: ${testId}`);

        // A. Fetch Local Norms (Competencies)
        const { data: localNormsRaw } = await supabase
            .from('test_norms')
            .select('*')
            .eq('test_id', testId);

        const competencyNorms = (localNormsRaw || [])
            .filter((n: any) => !n.category_name.startsWith('Scale_'))
            .map((n: any) => ({
                category_name: n.category_name.replace('Comp_', ''),
                mean_value: n.mean_value,
                std_dev_value: n.std_dev_value
            }));

        console.log(`Loaded ${competencyNorms.length} Local Competency Norms.`);

        // B. Fetch Competencies
        const { data: comps } = await supabase
            .from('competencies')
            .select('id, name, competency_scales ( scale_name )')
            .eq('test_id', testId);

        const compList = (comps || []).map((c: any) => ({
            name: c.name,
            competency_scales: c.competency_scales
        }));

        // C. Fetch Questions (Ordered)
        const { data: testQs } = await supabase
            .from('test_questions')
            .select('order_index, questions ( id, category, content, is_reverse_scored )')
            .eq('test_id', testId)
            .order('order_index');

        if (!testQs) continue;

        const questionsList = testQs.map(tq => ({
            id: tq.questions.id,
            category: tq.questions.category
        }));

        // D. Fetch Results to Update
        const { data: results } = await supabase
            .from('test_results')
            .select('id, answers_log, user_id')
            .eq('test_id', testId);

        if (!results) continue;
        console.log(`Found ${results.length} results to update.`);

        // E. Recalculate Each Result
        for (const res of results) {
            let answers: Record<string, number> = {}; // { qId: rawValue }

            // Parse answers_log
            // Format can be: 
            // 1. Array of objects: [{ question_id: "...", selected_option: 4 }]
            // 2. Object: { "0": 4, "1": 3 } (Index based)

            const log = res.answers_log as any;

            if (Array.isArray(log)) {
                if (log.length > 0 && typeof log[0] === 'object' && 'question_id' in log[0]) {
                    // Clean format
                    log.forEach((item: any) => {
                        let val = item.selected_option;
                        // In DB, selected_option is 0-based usually. 
                        // Check item.score if exists? 
                        // If we are recalculating, safer to re-derive from selected_option (index)
                        // because OLD logic might have saved wrong score.

                        let raw = (typeof val === 'number' ? val : parseInt(val)) + 1;

                        // Apply Reverse Scoring
                        // Find question
                        const q = testQs.find(tq => tq.questions.id === item.question_id)?.questions;
                        if (q && q.is_reverse_scored) {
                            raw = 6 - raw;
                        }
                        if (q) answers[q.id] = raw;
                    });
                } else {
                    // Array of [key, val] entries? or just array of values?
                    // Assume Object.entries format if seen before. Or plain array of indices.
                    console.log(`Skipping Result ${res.id}: Unknown Array format`, JSON.stringify(log).slice(0, 50));
                    continue;
                }
            } else if (typeof log === 'object' && log !== null) {
                // HYBRID LOGIC (User Request 2026-01-15):
                // 1. Mind Care Scales (7 items): Use raw value (to prevent inflation).
                // 2. All Other Scales: Use val + 1 (Old logic, to maintain high scores).

                const MIND_CARE_CATEGORIES = [
                    '불안/우울 장애', '불안/우울장애',
                    '공격성',
                    '조현형 성격장애', '조현형성격장애',
                    '반사회적 성격장애', '반사회적성격장애',
                    '경계선 성격장애', '경계선성격장애',
                    '의존성 성격장애', '의존성성격장애',
                    '편집성 성격장애', '편집성성격장애', '편접성 성격장애'
                ];

                const isMindCare = (cat: string) => {
                    if (!cat) return false;
                    const clean = cat.replace(/\s+/g, '');
                    return MIND_CARE_CATEGORIES.some(m => m.replace(/\s+/g, '') === clean);
                };

                // Index based map: { "0": 4 }
                Object.entries(log).forEach(([idxStr, val]) => {
                    // Check if Key is UUID (length > 20)
                    let qData: any = null;
                    if (idxStr.length > 20) {
                        const qid = idxStr;
                        const tq = testQs.find(t => t.questions.id === qid);
                        if (tq) qData = tq;
                    } else {
                        const idx = parseInt(idxStr);
                        qData = testQs[idx];
                    }

                    if (qData) {
                        let parsedVal = (typeof val === 'number' ? val : parseInt(val as string));

                        // 1. Calculate Standard Score (1-5 range)
                        let raw = parsedVal;
                        if (qData.questions.is_reverse_scored) {
                            raw = 6 - raw;
                        }

                        // 2. Hybrid Inflation (User Request) REMOVED. Strict Standard Scoring.
                        // const category = qData.questions.category;
                        // if (!isMindCare(category)) {
                        //     raw = raw + 1;
                        // }

                        answers[qData.questions.id] = raw;
                    }
                });
            }

            if (Object.keys(answers).length === 0) continue;

            // F. Calculate
            const details = calculatePersonalityScores(
                answers,
                questionsList,
                scaleNorms,
                competencyNorms,
                compList
            );

            // G. Update DB
            const { error: updateError } = await supabase
                .from('test_results')
                .update({
                    total_score: Math.round(details.total.t_score),
                    t_score: Math.round(details.total.t_score), // Update t_score column too
                    detailed_scores: details as any
                })
                .eq('id', res.id);

            if (updateError) console.error(`Failed to update ${res.id}:`, updateError);
            // else process.stdout.write('.');
        }
        console.log(`\nCompleted Test ID: ${testId}`);
    }
    console.log('All updates finished.');
}

main();
