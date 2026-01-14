
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function recalculateScore() {
    console.log("Starting Recalculation...");

    const email = 'paycmh@gmail.com';
    const testName = '김현근 표준 검사';

    // 1. Fetch User & Test Result
    const { data: user } = await supabase.from('users').select('id').eq('email', email).single();
    if (!user) { console.error("User not found"); return; }

    const { data: test } = await supabase.from('tests').select('id').ilike('title', `%${testName}%`).single();
    if (!test) { console.error("Test not found"); return; }

    const { data: result } = await supabase
        .from('test_results')
        .select('*')
        .eq('user_id', user.id)
        .eq('test_id', test.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

    if (!result) { console.error("Result not found"); return; }

    console.log(`Analyzing Result ID: ${result.id}`);
    const answers = result.answers_log as Record<string, number>;
    if (!answers) { console.error("No answers log found"); return; }

    // 2. Fetch Questions (to map answers to categories)
    // Need to know which question belongs to which category (Scale)
    const { data: relations, error: rError } = await supabase
        .from('test_questions')
        .select(`
            questions (
                id, score, is_reverse_scored, category 
            ),
            order_index
        `)
        .eq('test_id', test.id)
        .order('order_index', { ascending: true });

    if (rError || !relations) { console.error("Questions fetch error", rError); return; }

    const questionsMap = relations.map((r: any) => ({
        ...r.questions,
        idx: r.order_index // Caution: answers keys might be index-based. Check page.tsx logic.
        // In page.tsx: answers = { [index]: score }
    }));

    // 3. Calculate Raw Scores
    const categoryRawScores: Record<string, number> = {};
    let totalRawScore = 0;

    // answers keys are indices (0, 1, 2...)
    Object.entries(answers).forEach(([keyIdx, val]) => {
        const idx = parseInt(keyIdx);
        const q = questionsMap[idx]; // Assuming relations are ordered correctly by order_index
        if (q) {
            const answer = val as number;
            // Handle reverse scoring if needed (assuming 1-5 scale, 6-val)
            // But usually page.tsx handles logic. Let's assume raw input 1-5.
            // Wait, page.tsx logic: score = q.is_reverse_scored ? (6 - answer) : answer;
            // We need to replicate this.

            const score = q.is_reverse_scored ? (6 - answer) : answer;
            const category = q.category || 'Unknown';

            // Note: DB category might be '협동성', but we need 'Scale_협동성' for norms matching?
            // Actually questions.category is usually the short name (plain).
            // We will map it to 'Scale_' prefix later if needed, or check both.

            categoryRawScores[category] = (categoryRawScores[category] || 0) + score;
            totalRawScore += score;
        }
    });

    console.log("Raw Scores Calculated:", categoryRawScores);

    // 4. Fetch All Norms
    const { data: norms } = await supabase.from('test_norms').select('*').eq('test_id', test.id);
    if (!norms) { console.error("Norms not found"); return; }

    const normMap: Record<string, { mean: number; stdDev: number }> = {};
    norms.forEach(n => {
        normMap[n.category_name] = { mean: Number(n.mean_value), stdDev: Number(n.std_dev_value) };
    });

    // 5. Calculate Scale T-Scores
    const scaleResults: Record<string, { raw: number, t_score: number }> = {};

    Object.entries(categoryRawScores).forEach(([cat, raw]) => {
        // Try finding norm with 'Scale_' prefix first, then Plain
        const norm = normMap[`Scale_${cat}`] || normMap[cat];

        let tScore = 50;
        if (norm && norm.stdDev > 0) {
            const zScore = (raw - norm.mean) / norm.stdDev;
            tScore = Math.round((zScore * 10 + 50) * 100) / 100;
        }
        scaleResults[cat] = { raw, t_score: tScore };
    });

    // 6. Calculate Competency T-Scores
    // Fetch Competency Definitions
    const { data: comps } = await supabase
        .from('competencies')
        .select('name, competency_scales(scale_name)')
        .eq('test_id', test.id);

    const competencyResults: Record<string, { t_score: number }> = {};

    if (comps) {
        comps.forEach((comp: any) => {
            const scales = comp.competency_scales.map((s: any) => s.scale_name);
            const memberTScores = scales
                .map((s: string) => scaleResults[s]?.t_score)
                .filter((v: number) => v !== undefined);

            let avgT = 50;
            if (memberTScores.length > 0) {
                avgT = memberTScores.reduce((a: number, b: number) => a + b, 0) / memberTScores.length;
            }

            // Check if there is a specific Comp norm (Norm Standardization)
            // Or just use the average (Classic method)
            // If norms exist for 'Comp_Name', we should use that against the SUM/AVG of raw?
            // Page.tsx logic: "Competency T-score = Average of Scale T-Scores" logic was used.
            // Let's stick to that for consistency, unless directed otherwise.

            competencyResults[comp.name] = { t_score: Math.round(avgT * 100) / 100 };
        });
    }

    // 7. Calculate Total Score
    // Page.tsx: Sum of Scale T-scores (or Comp T-scores) -> then Norm?
    // Let's re-use the simple average of T-scores for Total if no norm exists.
    // Or if 'TOTAL' norm exists.

    let finalTotalT = 50;
    const allTScores = Object.values(scaleResults).map(s => s.t_score);
    if (allTScores.length > 0) {
        const sumT = allTScores.reduce((a, b) => a + b, 0);
        const avgT = sumT / allTScores.length;
        finalTotalT = Math.round(avgT * 100) / 100;
    }

    console.log("Recalculation Complete.");
    console.log("Sample Scale T-Scores:", Object.entries(scaleResults).slice(0, 3));
    console.log("Sample Comp T-Scores:", Object.entries(competencyResults).slice(0, 3));
    console.log(`Old Total: ${result.t_score}, New Total: ${Math.round(finalTotalT)}`);

    // 8. Update DB
    const detailed_scores = {
        competencies: competencyResults,
        scales: scaleResults,
        total: { t_score: finalTotalT },
        raw_total: totalRawScore
    };

    const { error: updateError } = await supabase
        .from('test_results')
        .update({
            detailed_scores: detailed_scores,
            t_score: Math.round(finalTotalT),
            total_score: Math.round(finalTotalT),
            updated_at: new Date().toISOString()
        })
        .eq('id', result.id);

    if (updateError) {
        console.error("Update failed:", updateError);
    } else {
        console.log("✅ Successfully updated test results with recalculated scores.");
    }
}

recalculateScore();
