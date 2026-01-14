
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

function calculateTScore(raw: number, mean: number, stdCtx: number): number {
    if (stdCtx === 0) return 50;
    const z = (raw - mean) / stdCtx;
    let t = 50 + (z * 10);
    t = Math.max(20, Math.min(80, t));
    return t;
}

async function recalculateCorrectly() {
    console.log("Searching for test 'NIS Customizing Test'...");
    const { data: tests } = await supabase.from('tests').select('id').ilike('title', '%NIS%Customizing%');
    const testId = tests?.[0]?.id;
    if (!testId) { console.error("Test not found"); return; }

    const userId = '343867c2-1f4f-4a82-b376-507def31a864';

    // 2. Fetch All Attempts
    const { data: results } = await supabase
        .from('test_results')
        .select('*')
        .eq('test_id', testId)
        .eq('user_id', userId)
        .order('attempt_number');

    if (!results) { console.log("No results found"); return; }

    // 3. Fetch Norms
    const { data: norms } = await supabase.from('test_norms').select('*').eq('test_id', testId);
    if (!norms) { console.error("No norms found"); return; }

    const scaleNorms: Record<string, any> = {};
    const compNorms: Record<string, any> = {};
    norms.forEach(n => {
        if (n.category_name.startsWith('Scale_')) {
            scaleNorms[n.category_name.replace('Scale_', '')] = n;
        } else if (n.category_name.startsWith('Comp_')) {
            compNorms[n.category_name.replace('Comp_', '')] = n;
        } else if (n.category_name === 'TOTAL') {
            compNorms['TOTAL'] = n;
        }
    });

    // 4. Fetch Questions (ordered)
    // We need logic to map Index -> QID.
    // Ideally use results.questions_order. If null, use default order?
    // Let's fetch default order just in case.
    const { data: relations } = await supabase
        .from('test_questions')
        .select('question_id, is_practice, order_index, questions(id, category, is_reverse_scored)')
        .eq('test_id', testId)
        .order('order_index', { ascending: true });

    const defaultOrder = (relations || [])
        .filter((r: any) => !r.is_practice) // Filter practice if logic requires
        // Actually, check if answer indices include practice? 
        // Typically answers_log is 0-indexed across ALL questions presented.
        // Let's assume indices match the 'relations' array order (including practice).
        // Wait, typical logic is practice first?
        // Let's just use the QID map logic.
        .map((r: any) => r.questions);

    const qMapById: Record<string, any> = {};
    defaultOrder.forEach((q: any) => qMapById[q.id] = q);

    // 5. Fetch Competency Meta
    const { data: comps } = await supabase
        .from('competencies')
        .select('name, competency_scales(scale_name)')
        .eq('test_id', testId);

    for (const res of results) {
        console.log(`Processing Attempt ${res.attempt_number}...`);
        const answers = res.answers_log || {};
        const qOrder = res.questions_order;

        // Resolve QID for each Answer Key (Index)
        // answer keys are strings "0", "1"...
        const entries = Object.entries(answers);

        const scaleRaw: Record<string, number> = {};

        entries.forEach(([key, val]) => {
            const idx = parseInt(key);
            let qId = '';

            if (qOrder && Array.isArray(qOrder) && qOrder.length > idx) {
                qId = qOrder[idx];
            } else {
                // Fallback to default order?
                // This is risky if shuffled.
                // But attempt 2 likely has order.
                // If qOrder is null, maybe it used default?
                // Or maybe the user didn't have qOrder saved (legacy)?
                if (relations && relations[idx]) {
                    // relations includes practice?
                    // If answers includes practice answers...
                    // Let's try to look up qId from relations at that index.
                    // Assuming relations are sorted by order_index.
                    qId = relations[idx].questions.id;
                }
            }

            if (!qId) return; // Can't map

            const q = qMapById[qId];
            // If q not found (e.g. practice question not in defaultOrder map? Wait, I didn't verify practice filter)
            // If check fails, fetch specific Q details? 
            if (!q) {
                // Maybe practice question? Skip scoring?
                return;
            }

            // Check category. If 'practice', skip?
            // Assuming we only score real scales.

            let numVal = Number(val);
            if (q.is_reverse_scored) numVal = 6 - numVal;

            if (q.category) {
                scaleRaw[q.category] = (scaleRaw[q.category] || 0) + numVal;
            }
        });

        // B. Calculate Scale T-Scores
        const scaleT: Record<string, number> = {};
        const scaleDetails: Record<string, any> = {};

        Object.keys(scaleRaw).forEach(cat => {
            const norm = scaleNorms[cat];
            if (!norm) {
                scaleDetails[cat] = { raw: scaleRaw[cat] };
                return;
            }
            const t = calculateTScore(scaleRaw[cat], norm.mean_value, norm.std_dev_value);
            scaleT[cat] = t;
            scaleDetails[cat] = { raw: scaleRaw[cat], t_score: t };
        });

        // C. Comp T
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
                const norm = compNorms[c.name];
                if (norm) {
                    const finalT = calculateTScore(sumT, norm.mean_value, norm.std_dev_value);
                    compT[c.name] = finalT;
                    compDetails[c.name] = { raw: sumT, t_score: finalT };
                } else {
                    compDetails[c.name] = { raw: sumT };
                }
            }
        });

        // D. Total
        let totalRaw = 0;
        if (Object.keys(compT).length > 0) {
            totalRaw = Object.values(compT).reduce((a, b) => a + b, 0);
        } else {
            totalRaw = Object.values(scaleT).reduce((a, b) => a + b, 0);
        }

        let totalT = 0;
        const totalNorm = compNorms['TOTAL'] || compNorms['Comp_TOTAL'];
        if (totalNorm) {
            totalT = calculateTScore(totalRaw, totalNorm.mean_value, totalNorm.std_dev_value);
        }

        // F. Update DB
        const detailed_scores = {
            scales: scaleDetails,
            competencies: compDetails,
            total: { raw: totalRaw, t_score: totalT }
        };

        if (totalRaw > 0) {
            await supabase
                .from('test_results')
                .update({
                    detailed_scores: detailed_scores,
                    total_score: Math.round(totalT),
                    t_score: Math.round(totalT)
                })
                .eq('id', res.id);
            console.log(`  > Updated Attempt ${res.attempt_number}. Total T: ${Math.round(totalT)}`);
        } else {
            console.log(`  > Attempt ${res.attempt_number}: Raw Score 0. Skipped Update (or invalid mapping).`);
        }
    }
}

recalculateCorrectly();
