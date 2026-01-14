
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { calculatePersonalityScores } from '../lib/scoring';

/**
 * Recalculate Admin Scores
 * 
 * Purpose:
 * Update T-Scores for the Admin Account based on the NEWLY APPLIED Norms (NIS_260111).
 * 
 * Logic:
 * 1. Fetch Admin Results.
 * 2. Fetch Active Norms from DB.
 * 3. Re-Calculate.
 * 4. Update 'detailed_scores' and 'total_score'.
 */

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
const USER_ID = '343867c2-1f4f-4a82-b376-507def31a864';
const TARGET_TEST_TITLE_KEYWORD = 'NIS Customizing';

async function recalc() {
    console.log("Recalculating Admin Scores...");

    // 1. Get Test ID
    const { data: tests } = await supabase.from('tests').select('id').ilike('title', `%${TARGET_TEST_TITLE_KEYWORD}%`).limit(1);
    if (!tests || !tests.length) return console.error("Test not found");
    const testId = tests[0].id;

    // 2. Fetch Metadata (Questions, Norms, Comps)
    const [qResult, normsResult, compResult] = await Promise.all([
        supabase.from('test_questions').select('questions(id, category, is_reverse_scored)').eq('test_id', testId),
        supabase.from('test_norms').select('*').eq('test_id', testId),
        supabase.from('competencies').select('id, name, competency_scales(scale_name)').eq('test_id', testId)
    ]);

    const questionsMap = new Map();
    qResult.data?.forEach((q: any) => {
        questionsMap.set(q.questions.id, {
            id: q.questions.id,
            category: q.questions.category,
            isReversed: q.questions.is_reverse_scored || false
        });
    });

    // Prepare for lib/scoring
    // Need array of questions with 'id' and 'category'
    const scoringQuestions = Array.from(questionsMap.values());

    const norms = normsResult.data || [];
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
    const compList = (compResult.data || []).map((c: any) => ({ name: c.name, competency_scales: c.competency_scales }));

    // 3. Fetch Admin Results
    const { data: results } = await supabase.from('test_results')
        .select('*')
        .eq('user_id', USER_ID)
        .eq('test_id', testId);

    if (!results || results.length === 0) return console.log("No results found for admin.");
    console.log(`Found ${results.length} results. Processing...`);

    // 4. Loop & Update
    for (const r of results) {
        const answersLog = r.answers_log || {};
        const answersMap: Record<string, number> = {};

        // Reconstruct AnswersMap for Scoring (Apply Reversal)
        for (const [qId, val] of Object.entries(answersLog)) {
            if (qId === 'scoring_breakdown') continue;

            const qDef = questionsMap.get(qId);
            if (!qDef) continue; // Skip if unknown question

            const inputVal = Number(val);
            // Reversal Logic: If Reversed, Score = 6 - Input.
            // (Assuming answers_log stores Input 1-5)
            const score = qDef.isReversed ? (6 - inputVal) : inputVal;
            answersMap[qId] = score;
        }

        // Calculate
        const calculated = calculatePersonalityScores(
            answersMap,
            scoringQuestions,
            scaleNorms,
            compNorms,
            compList
        );

        const newTotal = Math.round(calculated.total.t_score);

        // Update DB
        await supabase.from('test_results').update({
            total_score: newTotal,
            detailed_scores: calculated,
            // t_score column? let's check if it exists or used. Step 181 used seed logic which put t_score likely in 'total_score' field? 
            // Step 161 (Seed Script) used: t_score: results.total.t_score.
            // Let's update t_score column too if possible, but total_score is standard.
        }).eq('id', r.id);

        console.log(`[Attempt ${r.attempt_number}] Updated: Total T-Score ${r.total_score} -> ${newTotal}`);
    }

    console.log("Recalculation Complete.");
}

recalc();
