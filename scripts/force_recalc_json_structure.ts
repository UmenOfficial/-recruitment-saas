
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

function calculateTScore(raw: number, mean: number, stdDev: number): number {
    if (!stdDev || stdDev === 0) return 50;
    const t = 50 + 10 * ((raw - mean) / stdDev);
    return Math.max(0, Math.min(100, t));
}

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

async function forceRecalcJson() {
    console.log('--- Force Recalculating Scores (JSON Structure Fix) ---\n');

    const TARGET_TEST_TYPES = ['NIS', 'Standard'];

    // 1. Get Target Tests
    const { data: tests } = await supabase.from('tests').select('id, title');
    const targetTests = tests?.filter(t => TARGET_TEST_TYPES.some(k => t.title.includes(k))) || [];

    for (const test of targetTests) {
        console.log(`\nProcessing Test: ${test.title} (${test.id})`);

        // Norms
        const { data: norms } = await supabase.from('test_norms').select('*').eq('test_id', test.id);
        if (!norms || norms.length === 0) continue;
        const { scaleNorms, competencyNorms } = mapNormsSimple(norms);

        // Competencies Meta
        const { data: competencies } = await supabase
            .from('competencies')
            .select(`id, name, competency_scales (scale_name)`)
            .eq('test_id', test.id);

        const compList = competencies?.map((c: any) => ({
            name: c.name,
            scales: c.competency_scales.map((cs: any) => cs.scale_name)
        })) || [];

        // Questions
        const { data: qLinks } = await supabase
            .from('test_questions')
            .select('questions(*)')
            .eq('test_id', test.id)
            .order('id', { ascending: true });

        const questions = qLinks?.map((l: any) => l.questions) || [];

        // Results
        const { data: results } = await supabase
            .from('test_results')
            .select('id, answers_log, user_id')
            .eq('test_id', test.id)
            .not('completed_at', 'is', null);

        if (!results) continue;
        console.log(`  Found ${results.length} results.`);

        for (const res of results) {
            const answers = res.answers_log || {};
            const scoresByScale: Record<string, { raw: number, count: number }> = {};

            questions.forEach((q: any, idx: number) => {
                const key = String(idx);
                const rawVal = answers[key];
                if (rawVal !== undefined) {
                    const val = q.is_reverse_scored ? (6 - rawVal) : rawVal;
                    const cat = q.category;
                    if (!scoresByScale[cat]) scoresByScale[cat] = { raw: 0, count: 0 };
                    scoresByScale[cat].raw += val;
                    scoresByScale[cat].count += 1;
                }
            });

            // STRUCTURE: nested like DetailedScores interface
            const finalDetailedScores: any = {
                scales: {},
                competencies: {},
                total: {},
                raw_total: 0
            };

            const scaleTMapped: Record<string, number> = {};

            // 1. SCALES
            scaleNorms.forEach(norm => {
                const plainName = norm.category_name.replace('Scale_', '');
                const scoreData = scoresByScale[plainName];
                const raw = scoreData ? scoreData.raw : 0;
                const t = calculateTScore(raw, norm.mean_value, norm.std_dev_value);

                // Keys used by frontend in scales map can be plain.
                finalDetailedScores.scales[plainName] = {
                    raw: raw,
                    t_score: parseFloat(t.toFixed(2))
                };
                scaleTMapped[plainName] = parseFloat(t.toFixed(2));
            });

            // 2. COMPETENCIES
            let totalRaw = 0;
            const compsToCalc = competencyNorms.filter(n => n.category_name !== 'Comp_TOTAL' && n.category_name !== 'TOTAL');

            compsToCalc.forEach(norm => {
                const compDef = compList.find((c: any) => c.name === norm.category_name || `Comp_${c.name}` === norm.category_name);
                let compRaw = 0;
                if (compDef && compDef.scales) {
                    compDef.scales.forEach((sName: string) => {
                        compRaw += (scaleTMapped[sName] || 0);
                    });
                }

                const t = calculateTScore(compRaw, norm.mean_value, norm.std_dev_value);

                // Key should match competency name in DB (Comp_...) because frontend comp.name comes from DB.
                finalDetailedScores.competencies[norm.category_name] = {
                    raw: parseFloat(compRaw.toFixed(2)),
                    t_score: parseFloat(t.toFixed(2))
                };
                totalRaw += t;
            });

            // 3. TOTAL
            finalDetailedScores.raw_total = parseFloat(totalRaw.toFixed(2));
            const totalNorm = competencyNorms.find(n => n.category_name === 'Comp_TOTAL' || n.category_name === 'TOTAL');

            if (totalNorm) {
                const finalT = calculateTScore(totalRaw, totalNorm.mean_value, totalNorm.std_dev_value);
                finalDetailedScores.total = {
                    raw: parseFloat(totalRaw.toFixed(2)),
                    t_score: parseFloat(finalT.toFixed(2))
                };
            }

            // Update
            const finalT = finalDetailedScores.total?.t_score || 0;

            if (finalT > 0 || Object.keys(answers).length === 0) {
                await supabase
                    .from('test_results')
                    .update({
                        detailed_scores: finalDetailedScores,
                        t_score: Math.round(finalT),
                        total_score: Math.round(finalT)
                    })
                    .eq('id', res.id);
            }
        }
        console.log(`  Completed Test ${test.title}`);
    }
}

forceRecalcJson();
