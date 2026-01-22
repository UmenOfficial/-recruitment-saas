
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

// Reuse logic from lib/scoring.ts (re-implemented here for script context)
// To import directly we need tsx to handle aliases, but let's copy core logic to be safe and independent.

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

// --- Scoring Logic Helpers ---
function calculateTScore(raw: number, mean: number, stdDev: number): number {
    if (!stdDev || stdDev === 0) return 50;
    const t = 50 + 10 * ((raw - mean) / stdDev);
    return Math.max(0, Math.min(100, t));
}

// Minimal Map Norms Logic
function mapNormsSimple(norms: any[]) {
    const scaleNorms: any[] = [];
    const competencyNorms: any[] = [];

    norms.forEach(n => {
        if (n.category_name.startsWith('Scale_')) {
            scaleNorms.push(n);
        } else if (n.category_name.startsWith('Comp_') || n.category_name === 'TOTAL') {
            competencyNorms.push(n);
        }
    });
    return { scaleNorms, competencyNorms };
}

async function forceRecalc() {
    console.log('--- Force Recalculating Scores (Standardized Norms) ---\n');

    const TARGET_TEST_TYPES = ['NIS', 'Standard']; // Keywords

    // 1. Get Target Tests
    const { data: tests } = await supabase.from('tests').select('id, title');
    const targetTests = tests?.filter(t => TARGET_TEST_TYPES.some(k => t.title.includes(k))) || [];

    if (targetTests.length === 0) {
        console.log('No target tests found.');
        return;
    }

    for (const test of targetTests) {
        console.log(`\nProcessing Test: ${test.title} (${test.id})`);

        // 2. Get Data for this Test
        // Norms
        const { data: norms } = await supabase.from('test_norms').select('*').eq('test_id', test.id);
        if (!norms || norms.length === 0) {
            console.log('  No norms found. Skipping.');
            continue;
        }
        const { scaleNorms, competencyNorms } = mapNormsSimple(norms);
        console.log(`  Norms: ${scaleNorms.length} Scales, ${competencyNorms.length} Competencies.`);

        // Competencies Meta
        const { data: competencies } = await supabase
            .from('competencies')
            .select(`id, name, competency_scales (scale_name)`)
            .eq('test_id', test.id);

        const compList = competencies?.map((c: any) => ({
            name: c.name, // Ensure this matches Norm name (e.g. Comp_...)
            // Wait, competency table names might differ from Norm names?
            // User fix: Competencies names NOW have Comp_ prefix in DB actions. 
            // So c.name should be 'Comp_도전' etc.
            scales: c.competency_scales.map((cs: any) => cs.scale_name)
        })) || [];

        // Questions (Ordered by sequence for Index mapping)
        // Need to check how they are linked. test_questions -> questions
        // Order by Sequence usually? Or just ID? 
        // The index-based log usually corresponds to the array order presented to user.
        // Assuming 'test_questions' joined with 'questions' ordered by 'id' or creation?
        // Let's try to query consistent order. Usually Sort by 'test_questions(sequence)' if exists?
        // Checking schema via select: 'sequence' is in test_questions?
        // Let's assume natural link order or id order if sequence missing.

        // Actually, usually app fetches by test_questions and sorts by something.
        // Let's try fetching test_questions ordered by their ID or sequence if available.
        // There is 'sequence' in `test_questions`? Not checked.
        // Based on previous inspections, mostly it's logical order.

        const { data: qLinks, error: qErr } = await supabase
            .from('test_questions')
            .select('questions(*)')
            .eq('test_id', test.id)
            .order('id', { ascending: true }); // Best guess for stability

        if (!qLinks) {
            console.log('  No questions found.');
            continue;
        }

        const questions = qLinks.map((l: any) => l.questions);
        console.log(`  Questions: ${questions.length}`);

        // 3. Get Results
        const { data: results } = await supabase
            .from('test_results')
            .select('id, answers_log, user_id')
            .eq('test_id', test.id)
            .not('completed_at', 'is', null);

        if (!results || results.length === 0) {
            console.log('  No results to process.');
            continue;
        }
        console.log(`  Found ${results.length} results.`);

        // 4. Calculate
        for (const res of results) {
            const answers = res.answers_log || {};

            // Map Answers (Index -> ID -> Value)
            // Questions array is 0-indexed matches keys "0", "1"...
            const scoresByScale: Record<string, { raw: number, count: number }> = {};

            questions.forEach((q: any, idx: number) => {
                const key = String(idx);
                const rawVal = answers[key];

                if (rawVal !== undefined) {
                    const val = q.is_reverse_scored ? (6 - rawVal) : rawVal; // 1-5 scale assumed
                    const cat = q.category;

                    if (!scoresByScale[cat]) scoresByScale[cat] = { raw: 0, count: 0 };
                    scoresByScale[cat].raw += val;
                    scoresByScale[cat].count += 1;
                }
            });

            // Calc T-Scores for Scales
            const detailedScores: any = {};
            let totalT = 0;
            let countT = 0;

            // SCALES
            scaleNorms.forEach(norm => {
                const plainName = norm.category_name.replace('Scale_', ''); // Questions use plain category
                const scoreData = scoresByScale[plainName];
                const raw = scoreData ? scoreData.raw : 0; // Default 0 if no answers?

                const t = calculateTScore(raw, norm.mean_value, norm.std_dev_value);
                detailedScores[norm.category_name] = {
                    raw_score: raw,
                    t_score: parseFloat(t.toFixed(2)),
                    percentile: 0 // Optional
                };
            });

            // COMPETENCIES & TOTAL
            competencyNorms.forEach(norm => {
                // Determine Raw Score for Competency
                // If it's TOTAL, sum of all scales? Or sum of all questions?
                // Usually Competency is sum of T-Scores of its scales? Or avg?
                // Standard logic: Competency Raw = Sum of T-Scores of included Scales.

                let compRaw = 0;

                if (norm.category_name === 'Comp_TOTAL' || norm.category_name === 'TOTAL') {
                    // Total is often sum of Competency T-Scores? Or avg of all scales?
                    // User logic in lib/scoring.ts:
                    /*
                     const totalRaw = Object.values(scaleScores).reduce((sum, s) => sum + s.t_score, 0); // Sum of Scale T-scores
                     const totalT = calculateTScore(totalRaw, totalNorm.mean, totalNorm.std);
                    */
                    // Let's sum all Scale T-scores for Total Raw
                    Object.values(detailedScores).forEach((s: any) => {
                        if (String(s).includes('t_score')) compRaw += s.t_score; // Heuristic
                        else if (s.t_score) compRaw += s.t_score;
                    });

                } else {
                    // Specific Competency
                    // Find matching definition
                    // norm.category_name e.g. 'Comp_도전'
                    // compList item.name e.g. 'Comp_도전' or '도전'
                    // If compList names don't have prefix yet in DB? (We enforced it for NEW ones, but old ones?)
                    // Let's try matching with/without prefix.
                    const compDef = compList.find((c: any) => c.name === norm.category_name || `Comp_${c.name}` === norm.category_name);

                    if (compDef && compDef.scales) {
                        compDef.scales.forEach((sName: string) => {
                            // sName is scale name e.g '도전성'
                            // We keyed detailedScores with 'Scale_도전성'
                            const sKey = `Scale_${sName}`;
                            if (detailedScores[sKey]) {
                                compRaw += detailedScores[sKey].t_score;
                            }
                        });
                    }
                }

                const t = calculateTScore(compRaw, norm.mean_value, norm.std_dev_value);

                // Special key for Total? 'total'?
                if (norm.category_name === 'Comp_TOTAL' || norm.category_name === 'TOTAL') {
                    detailedScores['total'] = {
                        raw_score: parseFloat(compRaw.toFixed(2)),
                        t_score: parseFloat(t.toFixed(2))
                    };
                } else {
                    detailedScores[norm.category_name] = {
                        raw_score: parseFloat(compRaw.toFixed(2)),
                        t_score: parseFloat(t.toFixed(2))
                    };
                }
            });

            // Update DB
            const finalT = detailedScores['total']?.t_score || 0;

            // Only update if looks valid (not 0 if answers existed)
            if (finalT > 0 || Object.keys(answers).length === 0) {
                const { error: upErr } = await supabase
                    .from('test_results')
                    .update({
                        detailed_scores: detailedScores,
                        t_score: Math.round(finalT),
                        total_score: Math.round(finalT)
                    })
                    .eq('id', res.id);

                if (upErr) console.error(`    Error updating ${res.id}:`, upErr.message);
                // else console.log(`    Updated ${res.id}: T=${finalT}`);
            }
        }
        console.log(`  Completed Test ${test.title}`);
    }
}

forceRecalc();
