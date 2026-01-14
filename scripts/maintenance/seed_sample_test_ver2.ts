
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) { console.error('Missing env'); process.exit(1); }
const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
    console.log('Starting seed...');

    const { data: test } = await supabase.from('tests').select('id, title').eq('title', 'Sample Test: ver2').single();
    if (!test) { console.error('Test not found'); return; }

    const { data: posting } = await supabase.from('postings').select('id').limit(1).single();
    if (!posting) { console.error('No postings found'); return; }

    const [questionsResult, normsResult, compResult] = await Promise.all([
        supabase.from('test_questions').select('questions(id, category, is_reverse_scored)').eq('test_id', test.id),
        supabase.from('test_norms').select('*').eq('test_id', test.id),
        supabase.from('competencies').select(`id, name, competency_scales ( scale_name )`).eq('test_id', test.id)
    ]);

    const questions = questionsResult.data?.map((q: any) => q.questions).filter(Boolean) || [];
    const competencies = compResult.data || [];

    // Create/Reuse Dummy app
    let appId: string;
    const { data: existingApp } = await supabase.from('applications')
        .select('id')
        .eq('name', 'Dummy Bulk User')
        .maybeSingle();

    if (existingApp) {
        appId = existingApp.id;
        console.log('Using existing Dummy App:', appId);
        // CLEANUP
        await supabase.from('test_results').delete().eq('application_id', appId).eq('test_id', test.id);
        console.log('Cleaned up old results.');
    } else {
        const { data: newApp, error: createError } = await supabase.from('applications').insert({
            posting_id: posting.id,
            name: 'Dummy Bulk User',
            status: 'TEST_COMPLETED'
        }).select().single();

        if (createError) {
            console.error('Failed to create app:', createError.message);
            return;
        }
        appId = newApp.id;
        console.log('Created new Dummy App:', appId);
    }

    console.log(`Generating 200 results for App ID: ${appId}...`);

    // --- PASS 1: Generate Answers & Scale Raw Stats ---
    const pass1Data = [];
    const scaleRawValues: Record<string, number[]> = {};

    for (let i = 1; i <= 200; i++) {
        const answers: Record<string, number> = {};
        const scaleRaw: Record<string, number> = {};

        questions.forEach((q: any) => {
            const val = Math.floor(Math.random() * 5); // 0-4
            const score = val + 1; // 1-5
            answers[q.id] = val;
            if (q.category) {
                scaleRaw[q.category] = (scaleRaw[q.category] || 0) + score;
            }
        });

        // Collect stats
        Object.entries(scaleRaw).forEach(([cat, raw]) => {
            if (!scaleRawValues[cat]) scaleRawValues[cat] = [];
            scaleRawValues[cat].push(raw);
        });

        pass1Data.push({ i, answers, scaleRaw });
    }

    // Calc Local Scale Norms
    const scaleNorms: Record<string, { mean: number, std: number }> = {};
    Object.entries(scaleRawValues).forEach(([cat, val]) => {
        const mean = val.reduce((a, b) => a + b, 0) / val.length;
        const variance = val.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / val.length;
        scaleNorms[cat] = { mean, std: Math.sqrt(variance) || 1 };
    });

    // --- PASS 2: Calculate Competency Raw Stats ---
    const pass2Data = [];
    const compRawValues: Record<string, number[]> = {};

    for (const d of pass1Data) {
        // Calc Scale T
        const scaleTScoresMap: Record<string, number> = {};
        const scaleTScoresObj: Record<string, any> = {};

        Object.entries(d.scaleRaw).forEach(([cat, raw]) => {
            const n = scaleNorms[cat];
            const t = 50 + 10 * ((raw - n.mean) / n.std);
            scaleTScoresMap[cat] = t;
            scaleTScoresObj[cat] = { raw, t_score: t }; // Save for final
        });

        // Calc Comp Raw (Sum of Scale T)
        const compRawMap: Record<string, number> = {};
        competencies.forEach((comp: any) => {
            const names = comp.competency_scales.map((cs: any) => cs.scale_name);
            let cRaw = 0;
            names.forEach((n: string) => cRaw += (scaleTScoresMap[n] || 0));

            compRawMap[comp.name] = cRaw;

            if (!compRawValues[comp.name]) compRawValues[comp.name] = [];
            compRawValues[comp.name].push(cRaw);
        });

        pass2Data.push({ ...d, scaleTScoresObj, compRawMap });
    }

    // Calc Local Competency Norms
    const compNorms: Record<string, { mean: number, std: number }> = {};
    Object.entries(compRawValues).forEach(([name, val]) => {
        const mean = val.reduce((a, b) => a + b, 0) / val.length;
        const variance = val.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / val.length;
        compNorms[name] = { mean, std: Math.sqrt(variance) || 1 };
    });

    // --- PASS 3: Calculate Final Scores & Payload ---
    const payload = [];
    for (const d of pass2Data) {
        const compScores: Record<string, any> = {};
        let totalRaw = 0; // "Total Raw" = Sum of Comp T-Scores

        Object.entries(d.compRawMap).forEach(([name, cRaw]) => {
            const n = compNorms[name];
            // Calc Comp T
            const cT = 50 + 10 * ((cRaw - n.mean) / n.std);

            compScores[name] = { raw: cRaw, t_score: cT };
            totalRaw += cT;
        });

        // We can just use placeholder Total T since we are seeding for Norms anyway.
        // But Total Raw VARIANCE is what matters for Total Norm generation.
        // totalRaw is now Sum of Varied Comp T-Scores, so it should vary.
        const totalT = 50;

        payload.push({
            application_id: appId,
            test_id: test.id,
            attempt_number: d.i,
            answers_log: d.answers,
            total_score: totalT,
            max_score: 0,
            completed_at: new Date().toISOString(),
            detailed_scores: {
                scales: d.scaleTScoresObj,
                competencies: compScores,
                total: { raw: totalRaw, t_score: totalT }
            }
        });
    }

    const batchSize = 50;
    for (let i = 0; i < payload.length; i += batchSize) {
        const batch = payload.slice(i, i + batchSize);
        const { error: insError } = await supabase.from('test_results').insert(batch);
        if (insError) console.error(`Batch Failed:`, insError.message);
        else console.log(`Batch ${i / batchSize + 1} Inserted.`);
    }
}
main();
