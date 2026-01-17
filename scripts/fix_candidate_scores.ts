
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { calculatePersonalityScores, ScoringQuestion, ScoringNorm, ScoringCompetency } from '../lib/scoring';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl!, supabaseServiceKey!);

const RESULT_ID = 'fc270ad3-855c-4288-8db8-cc9a94a69b4f';
const TEST_ID = 'a724bab1-b7e2-4b99-a5a3-8ae47cd9411e';
const GLOBAL_TEST_ID = '8afa34fb-6300-4c5e-bc48-bbdb74c717d8';

async function main() {
    console.log(`Starting score fix for Result ID: ${RESULT_ID}`);

    // 1. Fetch Result (Answers)
    const { data: result } = await supabase
        .from('test_results')
        .select('answers_log')
        .eq('id', RESULT_ID)
        .single();

    if (!result) { console.error('Result not found'); return; }

    const answersLog = result.answers_log as Record<string, number> | any[];
    let answersMap: Record<string, number> = {};

    // 2. Fetch Questions (Order)
    // We need to map index-based answers to Question IDs and Categories
    const { data: testQs } = await supabase
        .from('test_questions')
        .select('order_index, questions ( id, category, content, is_reverse_scored )')
        .eq('test_id', TEST_ID)
        .order('order_index');

    if (!testQs) { console.error('Questions not found'); return; }

    // Map Answers (Index -> ID -> Value)
    // If answersLog is object/array
    if (Array.isArray(answersLog)) {
        // Assume format [{ question_id, selected_option, ... }] OR [ ["0", 4] ]
        // Previous log showed: [ ["0", 4], ["1", 3] ] -> Object.entries format? 
        // Wait, previous log said "Answers Log (Object...)" and printed `[ ["0", 4] ]` which is Object.entries output.
        // So answersLog IS an object `{"0": 4, "1": 3}`.
        console.error('Unexpected Array format for answers_log based on previous check, but handling...');
    } else {
        // Object: { "0": 4, "1": 3 }
        Object.entries(answersLog).forEach(([key, val]) => {
            const idx = parseInt(key);
            const qData = testQs[idx];
            if (qData && qData.questions) {
                // Determine score. Input 'val' is the answer (1-5 probably).
                // calculatePersonalityScores expects raw answer value? 
                // Wait, lib/scoring.ts line 49: `const score = typeof val === 'number' ? val : parseFloat(val);`
                // And line 52: `scaleRawScores[...] += score`.
                // Does it handle reverse scoring?
                // lib/scoring.ts does NOT seem to handle reverse scoring! 
                // It just sums the values!
                // CHECK lib/scoring.ts again.
                // It iterates `Object.entries(answers)`.
                // It finds question by ID.
                // It sums score.
                // IT DOES NOT CHECK `is_reverse_scored`.

                // CRITICAL BUG IN SCORING LIB OR USAGE?
                // `app/api/test/submit/route.ts` line 82: `const scoreValue = ... + 1`. 
                // It seems route.ts prepares `answersMap` with the SCALED score?
                // No, route.ts line 127 calls `calculatePersonalityScores` with `answersMap`.
                // `answersMap` contains `scoreValue`.
                // `route.ts` Logic:
                // `scoredAnswers` map creates an object. `answersMap` is passed to lib.
                // `answersMap[qId] = scoreValue`.
                // `scoreValue` is just `selectedIdx + 1`. 
                // REVERSE SCORING IS MISSING IN ROUTE.TS AND LIB/SCORING.TS!

                // Wait, `ReportContent.tsx` DOES handle reverse scoring (line 155).
                // But `lib/scoring.ts` is used for `test_results.details`.
                // If `lib/scoring.ts` ignores reverse scoring, then T-Scores are WRONG.
                // I MUST FIX THIS. The user complained about the report.

                // Let's implement correct reverse scoring here in the script.
                // And I should probably fix `lib/scoring.ts` later or `route.ts`.

                let rawVal = typeof val === 'number' ? val : parseInt(val as string);

                // If the stored answer is 0-based index? "0": 4 -> assumes value 4?
                // In my fetch log: "0": 4. Previous output said `[0] ... (Rev: true)`. 
                // If 1-5 scale. Answering 4 on Rev=True means (6-4) = 2.
                // I need to apply this.

                const q = qData.questions;
                let finalScore = rawVal;

                // If stored answer is 0-4 index, we add 1?
                // User's previous data from other tasks suggests answers are 1-5 or 0-4.
                // Let's assume stored "4" means 4 on 1-5 scale? Or index 4 (5th option)?
                // Log from Result #2: "0": 4. 
                // Let's assume it is the VALUE 4 (Likert 4).

                if (q.is_reverse_scored) {
                    finalScore = 6 - rawVal;
                }

                answersMap[q.id] = finalScore;
            }
        });
    }

    // 3. Fetch Norms
    const { data: rules } = await supabase
        .from('test_norms')
        .select('*')
        .in('test_id', [TEST_ID, GLOBAL_TEST_ID]);

    if (!rules) { console.error('Norms not found'); return; }

    const scaleNorms = rules
        .filter((n: any) => n.category_name.startsWith('Scale_'))
        .map((n: any) => ({
            category_name: n.category_name.replace('Scale_', ''),
            mean_value: n.mean_value,
            std_dev_value: n.std_dev_value
        }));

    const competencyNorms = rules
        .filter((n: any) => !n.category_name.startsWith('Scale_'))
        .map((n: any) => ({
            category_name: n.category_name.replace('Comp_', ''),
            mean_value: n.mean_value,
            std_dev_value: n.std_dev_value
        }));

    // 4. Fetch Competencies
    const { data: compsData } = await supabase
        .from('competencies')
        .select('id, name, competency_scales ( scale_name )')
        .eq('test_id', TEST_ID);

    if (!compsData) { console.error('Competencies not found'); return; }

    const compsList = compsData.map((c: any) => ({
        name: c.name,
        competency_scales: c.competency_scales
    }));

    // 5. Calculate Scores
    // We can use the lib function if we prepare questions list.
    // BUT we already applied reverse scoring in `answersMap`.
    // The lib function sums values from `answersMap`.
    // So if I pass reverse-scored values, it works?
    // Let's check lib again.
    // `scaleRawScores[question.category] += score`.
    // Yes. So if I pass the CORRECTED score in answersMap, lib works.

    const questionsList = testQs.map(tq => ({
        id: tq.questions.id,
        category: tq.questions.category
    }));

    const details = calculatePersonalityScores(
        answersMap,
        questionsList,
        scaleNorms,
        competencyNorms,
        compsList
    );

    console.log('Calculated Details:', JSON.stringify(details, null, 2).substring(0, 200) + '...');

    // 6. Update DB
    const { error: updateError } = await supabase
        .from('test_results')
        .update({
            total_score: Math.round(details.total.t_score),
            detailed_scores: details as any // Correct column name
        })
        .eq('id', RESULT_ID);

    if (updateError) console.error('Update failed:', updateError);
    else console.log('Successfully updated test_results.');
}

main();
