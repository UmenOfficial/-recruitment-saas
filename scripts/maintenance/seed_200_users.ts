
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { calculatePersonalityScores, calculateTScore } from '@/lib/scoring';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

const TEST_ID = '131ce476-3d6d-453c-a2a1-70fa5c73289d'; // 김현근 표준 검사

// ... Categories ...
const SCALE_GROUPS = {
    CLINICAL: [
        '불안/우울장애', '공격성', '조현형 성격장애', '반사회적 성격장애',
        '경계선 성격장애', '의존성 성격장애', '편집성 성격장애'
    ],
    LIE: ['거짓말'],
    INCOMPLIANCE: ['지시불이행'],
    SELF_CONFIDENCE: ['자기신뢰도검증'],
};

const PROBABILITIES: Record<string, [number, number][]> = {
    CLINICAL: [[1, 0.20], [2, 0.40], [3, 0.40]], // Mean ~2.2
    LIE: [[1, 0.35], [2, 0.40], [3, 0.15], [4, 0.10]], // Mean ~2.0
    SELF_CONFIDENCE: [[1, 0.70], [2, 0.20], [3, 0.05], [4, 0.03], [5, 0.02]], // Mean ~1.5
    OTHERS: [[2, 0.10], [3, 0.40], [4, 0.40], [5, 0.10]], // Mean ~3.5
};

function weightedRandom(weights: [number, number][]): number {
    const total = weights.reduce((acc, [, w]) => acc + w, 0);
    let random = Math.random() * total;
    for (const [val, weight] of weights) {
        random -= weight;
        if (random <= 0) return val;
    }
    return weights[weights.length - 1][0];
}

function randomDate(start: Date, end: Date): string {
    return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime())).toISOString();
}

function calcMeanStd(values: number[]) {
    if (values.length === 0) return { mean: 0, std: 1 };
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / values.length;
    return { mean, std: Math.sqrt(variance) || 1 };
}

async function main() {
    console.log('Starting seed (Norm Separation logic)...');

    // 0. Cleanup
    const { data: oldApps } = await supabase.from('applications').select('id').ilike('name', 'Mock M%');
    if (oldApps && oldApps.length > 0) {
        const ids = oldApps.map(a => a.id);
        await supabase.from('test_results').delete().in('application_id', ids);
        await supabase.from('applications').delete().in('id', ids);
        console.log(`Deleted ${oldApps.length} records.`);
    }

    // 1. Fetch Schema
    const [qRes, cRes] = await Promise.all([
        supabase.from('test_questions').select('questions(id, category, content)').eq('test_id', TEST_ID),
        supabase.from('competencies').select(`id, name, competency_scales ( scale_name )`).eq('test_id', TEST_ID)
    ]);
    const questionList = qRes.data?.map((q: any) => q.questions).filter(Boolean) || [];
    const competencyList = cRes.data || [];

    // 2. Prepare Data Holders
    const usersAnswers: { i: number, answers: Record<string, number> }[] = [];
    const scaleRawValues: Record<string, number[]> = {};

    console.log('Pass 1: Scale Stats');
    for (let i = 0; i < 200; i++) {
        const answers: Record<string, number> = {};
        const tempScaleRaw: Record<string, number> = {};

        questionList.forEach((q: any) => {
            let val = 3;
            const cat = q.category;
            const content = q.content || "";

            if (cat === '지시불이행') {
                if (content.includes('전혀 그렇지 않다')) val = Math.random() < 0.9 ? 1 : weightedRandom([[3, 1], [4, 1], [5, 1]]);
                else if (content.includes('그렇지 않다')) val = Math.random() < 0.9 ? 2 : weightedRandom([[3, 1], [4, 1], [5, 1]]);
                else if (content.includes('보통')) val = Math.random() < 0.9 ? 3 : weightedRandom([[4, 1], [5, 1]]);
                else if (content.includes('매우 그렇다')) val = Math.random() < 0.9 ? 5 : 4;
                else if (content.includes('그렇다')) val = Math.random() < 0.9 ? 4 : 5;
            } else if (SCALE_GROUPS.CLINICAL.includes(cat)) { val = weightedRandom(PROBABILITIES.CLINICAL); }
            else if (SCALE_GROUPS.LIE.includes(cat)) { val = weightedRandom(PROBABILITIES.LIE); }
            else if (SCALE_GROUPS.SELF_CONFIDENCE.includes(cat)) { val = weightedRandom(PROBABILITIES.SELF_CONFIDENCE); }
            else { val = weightedRandom(PROBABILITIES.OTHERS); }

            answers[q.id] = val;
            if (cat) tempScaleRaw[cat] = (tempScaleRaw[cat] || 0) + val;
        });

        usersAnswers.push({ i, answers });
        Object.entries(tempScaleRaw).forEach(([k, v]) => {
            if (!scaleRawValues[k]) scaleRawValues[k] = [];
            scaleRawValues[k].push(v);
        });
    }

    // 2.1 Compute Scale Norms -> Store in scaleNorms ONLY
    const scaleNorms: any[] = [];
    Object.entries(scaleRawValues).forEach(([cat, vals]) => {
        const { mean, std } = calcMeanStd(vals);
        scaleNorms.push({ category_name: cat, mean_value: mean, std_dev_value: std });
    });

    console.log('Pass 2: Comp Stats');
    const compRawValues: Record<string, number[]> = {};

    for (const u of usersAnswers) {
        // Re-calc Scale Raw
        const sRaw: Record<string, number> = {};
        Object.entries(u.answers).forEach(([qid, val]) => {
            const q = questionList.find((xq: any) => xq.id === qid);
            if (q && q.category) sRaw[q.category] = (sRaw[q.category] || 0) + val;
        });

        // Calc Comp Raw (Sum Scale T)
        competencyList.forEach((comp: any) => {
            let cRaw = 0;
            comp.competency_scales.forEach((cs: any) => {
                const n = scaleNorms.find(x => x.category_name === cs.scale_name);
                // Use scale norm here
                cRaw += calculateTScore(sRaw[cs.scale_name] || 0, n?.mean_value || 0, n?.std_dev_value || 1);
            });
            if (!compRawValues[comp.name]) compRawValues[comp.name] = [];
            compRawValues[comp.name].push(cRaw);
        });
    }

    // 2.2 Compute Comp Norms -> Store in competencyNorms
    const competencyNorms: any[] = [];
    Object.entries(compRawValues).forEach(([name, vals]) => {
        const { mean, std } = calcMeanStd(vals);
        competencyNorms.push({ category_name: name, mean_value: mean, std_dev_value: std });
    });

    console.log('Pass 3: Total Stats');
    const totalRawValues: number[] = [];

    for (const u of usersAnswers) {
        const sRaw: Record<string, number> = {};
        Object.entries(u.answers).forEach(([qid, val]) => {
            const q = questionList.find((xq: any) => xq.id === qid);
            if (q) sRaw[q.category] = (sRaw[q.category] || 0) + val;
        });

        let totalRaw = 0;
        competencyList.forEach((comp: any) => {
            let cRaw = 0;
            comp.competency_scales.forEach((cs: any) => {
                const n = scaleNorms.find(x => x.category_name === cs.scale_name);
                cRaw += calculateTScore(sRaw[cs.scale_name] || 0, n?.mean_value || 0, n?.std_dev_value || 1);
            });

            // Use Comp Norm here
            const n = competencyNorms.find(x => x.category_name === comp.name);
            const cT = calculateTScore(cRaw, n?.mean_value || 0, n?.std_dev_value || 1);
            totalRaw += cT;
        });
        totalRawValues.push(totalRaw);
    }

    // 3.1 Compute Total Norms -> Add to competencyNorms (or separate, but lib checks both)
    const { mean: tMean, std: tStd } = calcMeanStd(totalRawValues);
    competencyNorms.push({ category_name: 'TOTAL', mean_value: tMean, std_dev_value: tStd });

    console.log(`Total Norm Mean: ${tMean}, Std: ${tStd} (Expected ~200)`);

    // --- 3.2 Insert Norms to DB with Prefixes ---
    console.log('Inserting Norms into DB...');
    // Delete old norms
    await supabase.from('test_norms').delete().eq('test_id', TEST_ID);

    const normPayload = [
        ...scaleNorms.map(n => ({
            test_id: TEST_ID,
            category_name: `Scale_${n.category_name}`,
            mean_value: n.mean_value,
            std_dev_value: n.std_dev_value
        })),
        ...competencyNorms.map(n => ({
            test_id: TEST_ID,
            category_name: `Comp_${n.category_name}`,
            mean_value: n.mean_value,
            std_dev_value: n.std_dev_value
        }))
    ];

    const { error: normError } = await supabase.from('test_norms').insert(normPayload);
    if (normError) console.error('Error inserting norms:', normError);
    else console.log(`Inserted ${normPayload.length} norms.`);

    // --- FINAL: Generate Payloads ---
    console.log('Final Pass: Generating Payload...');
    const { data: posting } = await supabase.from('postings').select('id').limit(1).single();
    if (!posting) return;

    const qMap = questionList.map((q: any) => ({ id: q.id, category: q.category }));
    const cMap = competencyList.map((c: any) => ({ name: c.name, competency_scales: c.competency_scales }));

    const refinedData: any[] = [];
    for (const u of usersAnswers) {
        // Pass strictly separated norms
        const details = calculatePersonalityScores(u.answers, qMap, scaleNorms, competencyNorms, cMap);
        refinedData.push({ ...u, detailed_scores: details });
    }

    const BATCH_SIZE = 50;
    for (let i = 0; i < refinedData.length; i += BATCH_SIZE) {
        const batch = refinedData.slice(i, i + BATCH_SIZE);
        const { data: apps } = await supabase.from('applications').insert(
            batch.map(d => ({
                posting_id: posting.id,
                name: `Mock M${Math.floor(d.i / 50)} U${d.i} ${Math.floor(Math.random() * 1000)}`,
                status: 'TEST_COMPLETED'
            })).slice()
        ).select('id');

        if (!apps) continue;

        const results = batch.map((d, idx) => ({
            application_id: apps[idx].id,
            test_id: TEST_ID,
            attempt_number: 1,
            answers_log: d.answers,
            total_score: d.detailed_scores.total.t_score,
            max_score: 100,
            completed_at: randomDate(new Date('2025-12-01'), new Date('2025-12-20')),
            detailed_scores: d.detailed_scores
        }));

        await supabase.from('test_results').insert(results);
        console.log(`Batch ${i / BATCH_SIZE + 1} inserted.`);
    }
    console.log('Done.');
}

main();
