
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

async function debugRecalc() {
    console.log('--- Debugging Score Calculation Values ---\n');

    // 1. Fetch norms for NIS
    const { data: tests } = await supabase.from('tests').select('id, title').ilike('title', '%NIS Customizing%').limit(1);
    const test = tests?.[0];
    if (!test) return console.log('Test not found');

    const { data: norms } = await supabase.from('test_norms').select('*').eq('test_id', test.id);
    const scaleNorms = norms?.filter(n => n.category_name.startsWith('Scale_')) || [];
    const compNorms = norms?.filter(n => n.category_name.startsWith('Comp_') || n.category_name === 'TOTAL') || [];

    console.log(`Norms Loaded: ${scaleNorms.length} Scales, ${compNorms.length} Comps`);

    // Check Total Norm
    const totalNorm = compNorms.find(n => n.category_name === 'Comp_TOTAL' || n.category_name === 'TOTAL');
    console.log(`Total Norm: Mean=${totalNorm?.mean_value}, SD=${totalNorm?.std_dev_value}`);

    // 2. Fetch Competencies
    const { data: competencies } = await supabase
        .from('competencies')
        .select(`id, name, competency_scales (scale_name)`)
        .eq('test_id', test.id);

    // 3. Fetch One Result (e.g. Kevin Kim)
    const { data: results } = await supabase
        .from('test_results')
        .select('id, answers_log, user_id')
        .eq('test_id', test.id)
        .eq('id', 'b916a05c-9535-4a0d-a3b4-d5085f47f076') // Specific ID
        .limit(1);

    const res = results?.[0];
    if (!res) return console.log('No result found');
    console.log(`\nAnalyzing Result ID: ${res.id}`);

    // 4. Questions Mapping
    const { data: qLinks } = await supabase
        .from('test_questions')
        .select('questions(*)')
        .eq('test_id', test.id)
        .order('id', { ascending: true }); // Assumption: ID order matches index

    const questions = qLinks?.map((l: any) => l.questions) || [];
    console.log(`Questions: ${questions.length}`);

    // 5. Calculate & Log
    const answers = res.answers_log || {};
    console.log('Answers Log Keys:', Object.keys(answers).length, 'keys');
    console.log('Sample Keys:', Object.keys(answers).slice(0, 5));
    console.log('Sample Values:', Object.values(answers).slice(0, 5));

    const scoresByScale: Record<string, { raw: number, count: number }> = {};

    questions.forEach((q: any, idx: number) => {
        const key = String(idx); // Index-based key
        const rawVal = answers[key];
        if (rawVal !== undefined) {
            const val = q.is_reverse_scored ? (6 - rawVal) : rawVal;
            const cat = q.category;
            if (!scoresByScale[cat]) scoresByScale[cat] = { raw: 0, count: 0 };
            scoresByScale[cat].raw += val;
            scoresByScale[cat].count += 1;
        }
    });

    console.log('\n--- Scale Scores ---');
    const scaleTMapped: Record<string, number> = {};

    scaleNorms.forEach(norm => {
        const plainName = norm.category_name.replace('Scale_', '');
        const data = scoresByScale[plainName];
        if (!data) {
            console.log(`  [${plainName}] No answers found. Raw=0`);
            scaleTMapped[plainName] = 0; // Default T?? No, calcT(0)
        } else {
            const t = calculateTScore(data.raw, norm.mean_value, norm.std_dev_value);
            scaleTMapped[plainName] = t;
            console.log(`  [${plainName}] Raw=${data.raw} (Count=${data.count}) -> Mean=${norm.mean_value}(SD=${norm.std_dev_value}) -> T=${t.toFixed(2)}`);
        }
    });

    console.log('\n--- Competency Scores ---');
    let totalRaw = 0;

    competencies?.forEach((comp: any) => {
        const compName = comp.name.startsWith('Comp_') ? comp.name : `Comp_${comp.name}`;
        const scales = comp.competency_scales.map((s: any) => s.scale_name);

        let cRaw = 0;
        scales.forEach((sName: string) => {
            // scaleTMapped keys are plain names
            cRaw += (scaleTMapped[sName] || 0);
        });

        // Find norm
        const norm = compNorms.find(n => n.category_name === compName);
        if (!norm) {
            console.log(`  [${compName}] Norm NOT FOUND!`);
            return;
        }

        const t = calculateTScore(cRaw, norm.mean_value, norm.std_dev_value);
        console.log(`  [${compName}] SumScaleT=${cRaw.toFixed(2)} -> Mean=${norm.mean_value}(SD=${norm.std_dev_value}) -> T=${t.toFixed(2)}`);

        totalRaw += t;
    });

    console.log('\n--- Total Score ---');
    console.log(`  Sum of Comp T-Scores (Total Raw) = ${totalRaw.toFixed(2)}`);

    if (totalNorm) {
        const finalT = calculateTScore(totalRaw, totalNorm.mean_value, totalNorm.std_dev_value);
        console.log(`  Total Norm: Mean=${totalNorm.mean_value}, SD=${totalNorm.std_dev_value}`);
        console.log(`  FINAL T-SCORE = ${finalT.toFixed(2)}`);
    } else {
        console.log('  Total Norm Missing!');
    }

}

debugRecalc();
