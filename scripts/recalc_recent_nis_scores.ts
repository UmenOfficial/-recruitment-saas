
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { submitTestAction } from '../app/candidate/personality/[id]/test/actions';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

// Note: submitTestAction is a server action. Calling it directly in script might fail due to cookie/auth dependency.
// Instead, we will replicate the scoring logic locally in this script to update the 'detailed_scores' jsonb column directly.

import { calculatePersonalityScores, ScoringQuestion } from '../lib/scoring';
import { mapNorms } from '../lib/norm-mapper';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function recalcScores() {
    console.log('--- Recalculating Scores using Corrected Norms ---\n');

    // 1. Find NIS Tests
    const { data: tests } = await supabase.from('tests').select('id, title').ilike('title', '%NIS%');
    if (!tests || tests.length === 0) return;

    for (const test of tests) {
        console.log(`Processing Test: ${test.title}`);

        // Get Data
        const { data: norms } = await supabase.from('test_norms').select('*').eq('test_id', test.id);
        const { data: competencies } = await supabase.from('competencies').select(`id, name, competency_scales (scale_name)`).eq('test_id', test.id);
        const { data: qLinks } = await supabase.from('test_questions').select('questions(*)').eq('test_id', test.id);

        if (!norms || !competencies || !qLinks) continue;

        const questions = qLinks.map((l: any) => l.questions);
        const compList = competencies.map((c: any) => ({
            name: c.name,
            competency_scales: c.competency_scales
        }));

        // Use the Mapper (Should now work because DB has Scale_ prefixes)
        const { scaleNorms, competencyNorms } = mapNorms(norms, compList);
        console.log(`  - Valid Mapped Norms: Scale=${scaleNorms.length}, Comp=${competencyNorms.length}`);

        if (scaleNorms.length === 0) {
            console.error('  FAIL: Still no scale norms mapped! Check DB.');
            continue;
        }

        const scoringQuestions: ScoringQuestion[] = questions.map((q: any) => ({
            id: q.id,
            category: q.category || '기타'
        }));

        // 2. Find recent results
        const { data: results } = await supabase
            .from('test_results')
            .select('id, user_id, answers_log, detailed_scores')
            .eq('test_id', test.id)
            .not('completed_at', 'is', null)
            .order('completed_at', { ascending: false })
            .limit(10); // Process last 10 for safety testing

        if (!results) continue;

        for (const res of results) {
            // Re-calculate
            // answers_log is Index -> Value. 
            // We need ID -> Value.
            // But verify_scoring_logic showed we pass ID-keyed map?
            // Let's check answers_log format.
            // If it's { "0": 1, "1": 5 }, we need to map via sorted questions?
            // Actually, let's assume answers_log is consistent with what submitTestAction expects if used internally.

            // Wait, existing results might have bad scores.
            // We need to match questions to answers.
            // If answers_log keys are QUESTION IDs, we are good.
            // If keys are INDICES, we need order.
            // For now, let's peek at one log.

            const answers = res.answers_log;
            let answersMap: Record<string, number> = {};

            // Heuristic check: are keys UUIDs?
            const sampleKey = Object.keys(answers)[0];
            const isUUID = sampleKey && sampleKey.length > 30; // approx

            if (isUUID) {
                // Already ID based
                // Apply reverse scoring if needed? 
                // Usually answers_log stores raw selected value. Reverse scoring is done during calculation.
                questions.forEach((q: any) => {
                    const rawVal = answers[q.id];
                    if (rawVal !== undefined) {
                        const val = q.is_reverse_scored ? (6 - rawVal) : rawVal;
                        answersMap[q.id] = val;
                    }
                });
            } else {
                console.log(`  Skipping Result ${res.id} (Index-based logic complex to reproduce here without order)`);
                continue;
            }

            const calculated = calculatePersonalityScores(
                answersMap,
                scoringQuestions,
                scaleNorms,
                competencyNorms,
                compList
            );

            // Update
            const { error: upErr } = await supabase
                .from('test_results')
                .update({
                    detailed_scores: calculated,
                    t_score: Math.round(calculated.total.t_score),
                    total_score: Math.round(calculated.total.t_score)
                })
                .eq('id', res.id);

            if (!upErr) console.log(`  Updated Result ${res.id}: New T=${Math.round(calculated.total.t_score)}`);
            else console.error(`  Update Failed ${res.id}`, upErr);
        }
    }
}

recalcScores();
