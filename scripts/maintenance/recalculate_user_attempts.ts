
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

// T-Score Formula: 50 + 10 * z (clamped 20-80 usually, check lib/scoring)
function calculateTScore(raw: number, mean: number, stdCtx: number): number {
    if (stdCtx === 0) return 50; // Avoid NaN
    const z = (raw - mean) / stdCtx;
    let t = 50 + (z * 10);
    // Clamp to 20-80 or similar? 
    // Admin UI doesn't seem to clamp in visible inspection, but lib might.
    // For safety, let's keep it raw T first. 
    // "calculatePersonalityScores" usually clamps.
    // Let's assume clamping to 20-80 is safe standard for personality.
    t = Math.max(20, Math.min(80, t));
    return t;
}

async function recalculate() {
    console.log("Searching for test 'NIS Customizing Test'...");
    const { data: tests } = await supabase.from('tests').select('id').ilike('title', '%NIS%Customizing%');
    const testId = tests?.[0]?.id;
    if (!testId) { console.error("Test not found"); return; }

    // 1. Identify User from Attempt 12
    const { data: seedRes } = await supabase
        .from('test_results')
        .select('user_id')
        .eq('test_id', testId)
        .eq('attempt_number', 12)
        .single();

    if (!seedRes) { console.error("Attempt 12 not found. Cannot identify user."); return; }
    const userId = seedRes.user_id;
    console.log(`Target User ID: ${userId}`);

    // 2. Fetch All Attempts for this User
    const { data: results } = await supabase
        .from('test_results')
        .select('*')
        .eq('test_id', testId)
        .eq('user_id', userId)
        .order('attempt_number');

    if (!results) { console.log("No results found"); return; }
    console.log(`Found ${results.length} attempts for user.`);

    // 3. Fetch Norms
    const { data: norms } = await supabase.from('test_norms').select('*').eq('test_id', testId);
    if (!norms) { console.error("No norms found"); return; }

    const scaleNorms: Record<string, any> = {};
    const compNorms: Record<string, any> = {};
    // Organize Norms
    norms.forEach(n => {
        if (n.category_name.startsWith('Scale_')) {
            scaleNorms[n.category_name.replace('Scale_', '')] = n;
        } else if (n.category_name.startsWith('Comp_')) {
            compNorms[n.category_name.replace('Comp_', '')] = n;
        } else if (n.category_name === 'TOTAL') {
            compNorms['TOTAL'] = n; // Ensure Total maps
        }
    });

    // 4. Fetch Questions (for Reverse logic & Categories)
    const { data: qData } = await supabase
        .from('test_questions')
        .select('questions(id, category, is_reverse_scored)')
        .eq('test_id', testId);

    // Map: QID -> { category, isReverse }
    const qMap: Record<string, any> = {};
    qData?.forEach((d: any) => {
        if (d.questions) qMap[d.questions.id] = d.questions;
    });

    // 5. Fetch Competency Meta
    const { data: comps } = await supabase
        .from('competencies')
        .select('name, competency_scales(scale_name)')
        .eq('test_id', testId);

    // Process Each Result
    for (const res of results) {
        console.log(`Processing Attempt ${res.attempt_number}...`);
        const answers = res.answers_log;

        // A. Calculate Raw Scale Scores
        const scaleRaw: Record<string, number> = {};

        Object.entries(answers).forEach(([qId, val]) => {
            const q = qMap[qId];
            if (!q) return;

            // Should verify if answers are 1-5 or 0-4. Based on seeding, likely 1-5.
            // Also seeded data handling used '6 - val' for reverse.
            let numVal = Number(val);
            if (q.is_reverse_scored) numVal = 6 - numVal;

            scaleRaw[q.category] = (scaleRaw[q.category] || 0) + numVal;
        });

        // B. Calculate Scale T-Scores
        const scaleT: Record<string, number> = {};
        const scaleDetails: Record<string, any> = {};

        Object.keys(scaleRaw).forEach(cat => {
            const norm = scaleNorms[cat];
            if (!norm) {
                console.warn(`No norm for scale ${cat}`);
                scaleDetails[cat] = { raw: scaleRaw[cat] }; // Fallback
                return;
            }
            const t = calculateTScore(scaleRaw[cat], norm.mean_value, norm.std_dev_value);
            scaleT[cat] = t;
            scaleDetails[cat] = { raw: scaleRaw[cat], t_score: t, percentile: 0 }; // Percentile skipped for now
        });

        // C. Calculate Competency T-Scores (Sum of Scale T)
        const compT: Record<string, number> = {};
        const compDetails: Record<string, any> = {};

        comps?.forEach((c: any) => {
            let sumT = 0;
            let valid = true;
            c.competency_scales.forEach((cs: any) => {
                const t = scaleT[cs.scale_name];
                if (t === undefined) valid = false;
                else sumT += t;
            });

            if (valid) {
                // Fetch Comp Norm (which is based on Sum T)
                const norm = compNorms[c.name];
                if (norm) {
                    const finalT = calculateTScore(sumT, norm.mean_value, norm.std_dev_value);
                    compT[c.name] = finalT;
                    compDetails[c.name] = { raw: sumT, t_score: finalT };
                } else {
                    // Fallback if no norm yet
                    compDetails[c.name] = { raw: sumT };
                }
            }
        });

        // D. Calculate Total T-Score (Sum of Comp T)
        // If comps exist, use sum of Comp T. Else sum of Scale T.
        let totalRaw = 0;
        if (Object.keys(compT).length > 0) {
            totalRaw = Object.values(compT).reduce((a, b) => a + b, 0);
        } else {
            totalRaw = Object.values(scaleT).reduce((a, b) => a + b, 0);
        }

        let totalT = 0;
        const totalNorm = compNorms['TOTAL'] || compNorms['Comp_TOTAL']; // Check both
        if (totalNorm) {
            totalT = calculateTScore(totalRaw, totalNorm.mean_value, totalNorm.std_dev_value);
        }

        // F. Update DB
        const detailed_scores = {
            scales: scaleDetails,
            competencies: compDetails,
            total: { raw: totalRaw, t_score: totalT }
        };

        await supabase
            .from('test_results')
            .update({
                detailed_scores: detailed_scores,
                total_score: Math.round(totalT),
                t_score: Math.round(totalT)
            })
            .eq('id', res.id);

        console.log(`  > Updated Attempt ${res.attempt_number}. Total T: ${Math.round(totalT)}`);
    }
    console.log("Recalculation Complete.");
}

recalculate();
