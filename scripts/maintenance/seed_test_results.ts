
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Fix for relative imports if we were using them, but we'll try to inline scoring or keep it simple
// Since we cannot easily import from 'lib/scoring' in a standalone script without alias setup
// I will INLINE the scoring logic here to guarantee it runs without build issues.

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

// --- SCORING LOGIC (Inlined from lib/scoring.ts) ---

interface ScoringQuestion {
    id: string;
    category: string;
}

interface ScoringNorm {
    category_name: string;
    mean_value: number;
    std_dev_value: number;
}

interface ScoringCompetency {
    name: string;
    competency_scales: { scale_name: string }[];
}

interface DetailedScores {
    scales: Record<string, { raw: number; t_score: number }>;
    competencies: Record<string, { raw: number; t_score: number }>;
    total: { raw: number; t_score: number };
    raw_total: number;
}

function calculateTScore(raw: number, mean: number, stdDev: number): number {
    if (!stdDev || stdDev === 0) return 50;
    const t = 50 + 10 * ((raw - mean) / stdDev);
    return Math.max(20, Math.min(80, t)); // Clamp 20-80 as per user expectation
}

function calculatePersonalityScores(
    answers: Record<string, number>, // Changed to number for strictness
    questions: ScoringQuestion[],
    scaleNorms: ScoringNorm[],
    competencyNorms: ScoringNorm[],
    competencies: ScoringCompetency[]
): DetailedScores {

    // 1. Calculate Scale Raw Scores
    const scaleRawScores: Record<string, number> = {};

    Object.entries(answers).forEach(([qId, val]) => {
        const question = questions.find(q => q.id === qId);
        if (!question || !question.category) return;

        const score = val;
        scaleRawScores[question.category] = (scaleRawScores[question.category] || 0) + score;
    });

    // 2. Calculate Scale T-Scores
    const scaleFinal: Record<string, { raw: number; t_score: number }> = {};
    const scaleTMapped: Record<string, number> = {};

    Object.keys(scaleRawScores).forEach(cat => {
        const raw = scaleRawScores[cat];
        const norm = scaleNorms.find(n => n.category_name === cat);
        const mean = norm?.mean_value || 0;
        const std = norm?.std_dev_value || 1;
        const t = calculateTScore(raw, mean, std);

        scaleFinal[cat] = { raw, t_score: t };
        scaleTMapped[cat] = t;
    });

    // 3. Calculate Competency Scores
    const competencyFinal: Record<string, { raw: number; t_score: number }> = {};
    let totalRaw = 0;

    competencies.forEach(comp => {
        const scaleNames = comp.competency_scales.map(s => s.scale_name);
        let cRaw = 0;
        scaleNames.forEach(name => {
            cRaw += (scaleTMapped[name] || 0);
        });

        const norm = competencyNorms.find(n => n.category_name === comp.name);
        const mean = norm?.mean_value || 0;
        const std = norm?.std_dev_value || 1;
        const cT = calculateTScore(cRaw, mean, std);

        competencyFinal[comp.name] = { raw: cRaw, t_score: cT };
        totalRaw += cT;
    });

    // 4. Calculate Total Score
    const totalNorm = competencyNorms.find(n => n.category_name === 'TOTAL')
        || scaleNorms.find(n => n.category_name === 'TOTAL');

    const totalMean = totalNorm?.mean_value || 0;
    const totalStd = totalNorm?.std_dev_value || 1;
    const totalT = calculateTScore(totalRaw, totalMean, totalStd);

    return {
        scales: scaleFinal,
        competencies: competencyFinal,
        total: { raw: totalRaw, t_score: totalT },
        raw_total: totalRaw
    };
}
// ----------------------------------------------------

async function seedResults() {
    console.log("Starting seed process...");

    // 1. Get User
    const { data: user, error: uErr } = await supabase
        .from('users')
        .select('id, email')
        .eq('email', 'test_candidate@umen.cloud')
        .single();

    if (uErr || !user) {
        console.error("User not found:", uErr);
        return;
    }
    console.log(`User found: ${user.email} (${user.id})`);

    // 2. Get NIS Test
    const { data: test, error: tErr } = await supabase
        .from('tests')
        .select('id')
        .ilike('title', '%NIS%')
        .single();

    if (tErr || !test) {
        console.error("Test not found:", tErr);
        return;
    }
    console.log(`Test found: ${test.id}`);

    // DELETE OLD RESULTS to reset attempts
    console.log("Deleting old results for clean slate...");
    await supabase.from('test_results').delete().eq('user_id', user.id).eq('test_id', test.id);

    // 3. Get Questions
    // Need to handle practice questions if any. But likely we want ALL 216 questions.
    // Assuming 216 is the full count regardless of practice?
    // User said "1 to 216".
    const { data: qRelations, error: qErr } = await supabase
        .from('test_questions')
        .select('question_id, is_practice, questions(*)')
        .eq('test_id', test.id)
        .order('order_index', { ascending: true });

    if (qErr) {
        console.error("Questions error:", qErr);
        return;
    }

    const allQuestions = qRelations.map((r: any) => ({
        ...r.questions,
        is_practice: r.is_practice
    }));
    console.log(`Loaded ${allQuestions.length} questions.`);

    // 4. Get Norms & Capabilities
    const { data: normsRaw } = await supabase.from('test_norms').select('*').eq('test_id', test.id);
    const { data: compDefsRaw } = await supabase.from('competencies').select('name, competency_scales(scale_name)').eq('test_id', test.id);

    const scaleNorms: ScoringNorm[] = (normsRaw || [])
        .filter(n => n.category_name.startsWith('Scale_'))
        .map(n => ({
            category_name: n.category_name.replace('Scale_', ''),
            mean_value: n.mean_value,
            std_dev_value: n.std_dev_value
        }));

    // Fallback if legacy norms exist (no prefix)
    (normsRaw || []).forEach(n => {
        if (!n.category_name.startsWith('Scale_') && !n.category_name.startsWith('Comp_')) {
            if (!scaleNorms.find(sn => sn.category_name === n.category_name)) {
                scaleNorms.push({
                    category_name: n.category_name,
                    mean_value: n.mean_value,
                    std_dev_value: n.std_dev_value
                });
            }
        }
    });

    const competencyNorms: ScoringNorm[] = (normsRaw || [])
        .filter(n => n.category_name.startsWith('Comp_'))
        .map(n => ({
            category_name: n.category_name.replace('Comp_', ''),
            mean_value: n.mean_value,
            std_dev_value: n.std_dev_value
        }));

    const competencies: ScoringCompetency[] = (compDefsRaw || []).map(c => ({
        name: c.name,
        competency_scales: c.competency_scales || []
    }));

    const scoringQuestions = allQuestions.map(q => ({
        id: q.id,
        category: q.category
    }));

    // 5. Generate Scenarios
    const scenarios = [
        { label: "All 1", valFn: (i: number) => 1 },
        { label: "All 2", valFn: (i: number) => 2 },
        { label: "All 3", valFn: (i: number) => 3 },
        { label: "All 4", valFn: (i: number) => 4 },
        { label: "All 5", valFn: (i: number) => 5 },
        { label: "1,2 Pattern", valFn: (i: number) => (i % 2 === 0) ? 1 : 2 },
        { label: "2,3 Pattern", valFn: (i: number) => (i % 2 === 0) ? 2 : 3 },
        { label: "3,4 Pattern", valFn: (i: number) => (i % 2 === 0) ? 3 : 4 },
        { label: "4,5 Pattern", valFn: (i: number) => (i % 2 === 0) ? 4 : 5 },
        { label: "3,3,3,4 Pattern", valFn: (i: number) => [3, 3, 3, 4][i % 4] },
        { label: "2,3,3,4 Pattern", valFn: (i: number) => [2, 3, 3, 4][i % 4] },
        { label: "3,4,4,4,5 Pattern", valFn: (i: number) => [3, 4, 4, 4, 5][i % 5] },
    ];

    let attempt = 1; // Start from 1 since we cleared

    for (let sIdx = 0; sIdx < scenarios.length; sIdx++) {
        const scenario = scenarios[sIdx];
        console.log(`Processing Scenario ${sIdx + 1}: ${scenario.label}`);

        const answersLog: Record<string, number> = {};
        const answersMapForScoring: Record<string, number> = {};

        // Generate Answers
        // questions_order will be simply the order fetched (0 to 215)
        const qOrderIds = allQuestions.map(q => q.id);

        allQuestions.forEach((q, idx) => {
            const rawVal = scenario.valFn(idx);

            // Log format: Index -> Value
            answersLog[idx] = rawVal;

            // Scoring format: UUID -> Scored Value
            // IMPORTANT: Handle Reverse Scoring logic as seen in page.tsx
            // If is_reverse_scored is true, then scored value = 6 - rawVal
            let scoredVal = rawVal;
            if (q.is_reverse_scored) {
                scoredVal = 6 - rawVal;
            }

            answersMapForScoring[q.id] = scoredVal;
        });

        // Calculate
        const detailedScores = calculatePersonalityScores(
            answersMapForScoring,
            scoringQuestions,
            scaleNorms,
            competencyNorms,
            competencies
        );

        // LOG T-SCORES for All 2s
        if (scenario.label === "All 2") {
            console.log(">>> [All 2s Check]");
            console.log("Total T:", detailedScores.total.t_score);
            // Check Mind Care
            const mindCareKeys = ["불안/우울장애", "공격성", "조현형 성격장애", "반사회적 성격장애"];
            mindCareKeys.forEach(k => {
                console.log(`${k}: ${detailedScores.scales[k]?.t_score}`);
            });
        }

        // Insert
        // Using "1: 1회", "2: 2회" etc for user reference if needed, but attempt_number handles logic.
        const { error: insErr } = await supabase.from('test_results').insert({
            test_id: test.id,
            user_id: user.id,
            attempt_number: attempt++,
            questions_order: qOrderIds,
            elapsed_seconds: 600 + sIdx, // Fake time
            current_index: allQuestions.length,
            answers_log: answersLog,
            completed_at: new Date().toISOString(),
            total_score: Math.round(detailedScores.total.t_score), // Column must be Integer
            t_score: Math.round(detailedScores.total.t_score),     // Column must be Integer
            detailed_scores: detailedScores // Keep Floats inside JSON
        });

        if (insErr) {
            console.error(`Failed to insert ${scenario.label}:`, insErr);
        } else {
            console.log(`Inserted ${scenario.label} as Attempt ${attempt - 1}`);
        }
    }
    console.log("Done.");
}

seedResults();
