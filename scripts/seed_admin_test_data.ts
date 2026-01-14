
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { calculatePersonalityScores } from '../lib/scoring';

/**
 * Seed Admin Test Data
 * - User: 343867c2-1f4f-4a82-b376-507def31a864
 * - Test: NIS Customizing Test
 * - Attempts: 20
 * 
 * Logic:
 * - Likert 1-5
 * - Reverse Scored Items (25 items) -> User Input = 6 - TargetVal
 * - Bias:
 *   - Normal Scales: Mean ~ 3.5-4.0 (80%), Std ~ 0.5-0.7 (80%)
 *   - Mind Care Scales (불안/우울장애, 반사회적 성격장애): Low Score Bias (1-2)
 */

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
const USER_ID = '343867c2-1f4f-4a82-b376-507def31a864'; // Admin Test Account
const MIND_CARE_KEYWORDS = ['불안', '우울', '반사회', '부적응', 'Mind', '스트레스'];

// Helper: Normal Distribution Sample (Box-Muller)
function sampleNormal(mean: number, stdUrl: number): number {
    let u = 0, v = 0;
    while (u === 0) u = Math.random();
    while (v === 0) v = Math.random();
    const z = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
    return mean + z * stdUrl;
}

// Helper: Clamp
function clamp(val: number, min: number, max: number) {
    return Math.max(min, Math.min(max, val));
}

async function seedData() {
    console.log("Seeding 20 Attempts for Admin Account...");

    // 1. Fetch Test & Questions & Norms
    const { data: tests } = await supabase.from('tests').select('id').ilike('title', '%NIS Customizing%').limit(1);
    if (!tests || !tests.length) return console.error("Test not found");
    const testId = tests[0].id;

    const [qResult, normsResult, compResult] = await Promise.all([
        supabase.from('test_questions').select('questions(id, category, is_reverse_scored)').eq('test_id', testId),
        supabase.from('test_norms').select('*').or(`test_id.eq.8afa34fb-6300-4c5e-bc48-bbdb74c717d8,test_id.eq.${testId}`),
        supabase.from('competencies').select('id, name, competency_scales(scale_name)').eq('test_id', testId)
    ]);

    const questions = qResult.data?.map((q: any) => ({
        id: q.questions.id,
        category: q.questions.category,
        isReversed: q.questions.is_reverse_scored || false
    })) || [];

    const norms = normsResult.data || [];
    const competencies = compResult.data || [];

    // Prepare lib/scoring inputs
    const scaleNorms = norms.filter((n: any) => n.category_name.startsWith('Scale_')).map((n: any) => ({
        category_name: n.category_name.replace('Scale_', ''),
        mean_value: n.mean_value,
        std_dev_value: n.std_dev_value
    }));
    const compNorms = norms.filter((n: any) => n.category_name.startsWith('Comp_')).map((n: any) => ({
        category_name: n.category_name.replace('Comp_', ''),
        mean_value: n.mean_value,
        std_dev_value: n.std_dev_value
    }));
    const compList = competencies.map((c: any) => ({ name: c.name, competency_scales: c.competency_scales }));

    // Identify Mind Care Scales
    const mindCareScales = new Set<string>();
    scaleNorms.forEach((n: any) => {
        if (MIND_CARE_KEYWORDS.some(k => n.category_name.includes(k))) {
            mindCareScales.add(n.category_name);
        }
    });
    console.log("Identified Mind Care Scales:", Array.from(mindCareScales));


    // 2. Generate 20 Attempts
    const attempts = Array.from({ length: 20 }, (_, i) => i + 1);

    for (const attempt of attempts) {
        // Bias Configuration
        const isOverestimating = Math.random() < 0.8;

        let targetMean = 3.0;
        let targetStd = 0.8;

        if (isOverestimating) {
            targetMean = 3.5 + Math.random() * 0.5; // 3.5 ~ 4.0
            targetStd = 0.5 + Math.random() * 0.2; // 0.5 ~ 0.7
        } else {
            targetMean = 3.0 + (Math.random() - 0.5) * 1.0;
            targetStd = 0.8 + (Math.random() - 0.5) * 0.4;
        }

        // Generate Answers
        const answersMap: Record<string, number> = {};
        const answersLog: Record<string, number> = {};

        questions.forEach((q: any) => {
            let finalVal = 0;

            if (mindCareScales.has(q.category)) {
                // Mind Care -> Low Score (1 or 2)
                const r = Math.random();
                if (r < 0.7) finalVal = 1;
                else if (r < 0.9) finalVal = 2;
                else finalVal = 3 + Math.floor(Math.random() * 3);
            } else {
                const rawSample = sampleNormal(targetMean, targetStd);
                finalVal = Math.round(clamp(rawSample, 1, 5));
            }

            // Input Value Calculation
            // finalVal is the Intended Converted Score (1=Low Trait, 5=High Trait)
            // If Reversed (e.g. "I am anxious"), Low Trait means answering 1 (Not anxious) -> Score 1? 
            // Wait. Usually "High Score" = "High Trait".
            // If Trait is "Anxiety" (Mind Care Scale), User selects 1 (Not anxious) -> Score 1 (Low Anxiety).
            // If Trait is "Resilience" (Positive Scale), User selects 5 (Very Resilient) -> Score 5 (High Resilience).
            //
            // But if Question is "I give up easily" (Reversed Resilience):
            // User selects 1 (No) -> Score 5 (High Resilience).
            //
            // My Logic: `finalVal` is the TRAIT LEVEL (1-5).
            // If `isReversed`: Input = 6 - finalVal.
            // If Not Reversed: Input = finalVal.

            let inputVal = finalVal;
            if (q.isReversed) {
                inputVal = 6 - finalVal;
            }

            // Map for calculation (expects TRAIT LEVEL if lib doesn't reverse, OR INPUT if lib reverses)
            // As discussed, we assume lib sums inputs. So we pass `finalVal`? No `finalVal` is Trait Level.
            // If lib sums inputs, passing `finalVal` (Trait Level) means we assume Trait Level = Score.
            // For Positive Q: Input=Trait. Lib Sums Input. Correct.
            // For Negative Q: Input=6-Trait. Lib Sums Input.
            //    If Lib sums Input (e.g. 1), Score is 1. Trait Level is 5.
            //    This means Score 1 != Trait 5.
            //    So T-Score will be Low.
            //    BUT Norms are usually based on High Score = High Trait?
            //    If Norms expect High Score for High Trait, then `lib` MUST be receiving Trait Level Scores (5).
            //    So `answersMap` MUST contain `finalVal`.

            answersMap[q.id] = finalVal; // Pass TRAIT LEVEL to Calculator
            answersLog[q.id] = inputVal; // Pass INPUT to DB Log
        });

        // Calculate
        const results = calculatePersonalityScores(
            answersMap,
            questions,
            scaleNorms,
            compNorms,
            compList
        );

        // Insert
        await supabase.from('test_results').insert({
            user_id: USER_ID,
            test_id: testId,
            attempt_number: attempt,
            total_score: Math.round(results.total.t_score),
            answers_log: { ...answersLog, scoring_breakdown: results },
            detailed_scores: results,
            completed_at: new Date().toISOString(),
        });

        console.log(`Inserted Attempt ${attempt}: T-Score=${results.total.t_score.toFixed(1)}`);
    }

    console.log("Seeding Complete.");
}

seedData();
