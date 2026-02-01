
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

const TARGET_TEST_ID = '9ec4a5e6-ae8f-4f0f-8452-604c25666633';
const NORM_TITLE = '삼성전자_20260125';

async function generateSamsungNorms() {
    console.log(`--- Generating Norms: ${NORM_TITLE} for Test ${TARGET_TEST_ID} ---\n`);

    // 1. Fetch Competencies
    const { data: comps, error: cErr } = await supabase
        .from('competencies')
        .select(`id, name, competency_scales ( scale_name )`)
        .eq('test_id', TARGET_TEST_ID);

    if (cErr) { console.error('Error fetching competencies:', cErr); return; }
    if (!comps || comps.length === 0) { console.error('No competencies found.'); return; }

    const usedScales = new Set<string>();
    comps.forEach(c => c.competency_scales.forEach((s: any) => usedScales.add(s.scale_name)));
    console.log(`Used Scales (${usedScales.size}):`, Array.from(usedScales).join(', '));

    // 2. Fetch Reference Scale Norms
    // (Used to generate the SCALE norms ONLY. Competency norms are derived from T-Score theory.)
    const { data: refNorms, error: nErr } = await supabase
        .from('test_norms')
        .select('*')
        .ilike('category_name', 'Scale_%')
        .order('created_at', { ascending: false });

    if (nErr) { console.error('Error fetching ref norms:', nErr); return; }

    const scaleStats: Record<string, { mean_value: number, std_dev_value: number }> = {};
    refNorms?.forEach(n => {
        const key = n.category_name;
        if (!scaleStats[key]) {
            scaleStats[key] = { mean_value: n.mean_value, std_dev_value: n.std_dev_value };
            const bareName = key.replace('Scale_', '');
            if (!scaleStats[bareName]) scaleStats[bareName] = { mean_value: n.mean_value, std_dev_value: n.std_dev_value };
        }
    });

    const newNorms = [];

    // 3. Generate Scale Norms (Copy existing RAW stats)
    for (const scale of usedScales) {
        const stat = scaleStats[`Scale_${scale}`] || scaleStats[scale] || { mean_value: 20, std_dev_value: 5 };
        newNorms.push({
            test_id: TARGET_TEST_ID,
            category_name: normalizeCategory('SCALE', scale),
            mean_value: stat.mean_value,
            std_dev_value: stat.std_dev_value
        });
    }

    // 4. Competency Norms (T-Score Summation Logic)
    // Competency Raw = Sum of Scale T-Scores.
    // Each Scale T-Score: Mean=50, Std=10.
    const T_MEAN = 50;
    const T_STD = 10;
    const ESTIMATED_CORRELATION = 0.5;

    for (const comp of comps) {
        const numScales = comp.competency_scales.length;

        // Mean = N * 50
        const compMean = numScales * T_MEAN;

        // Variance(Sum) = Sum(Var) + 2*Sum(Cov_pairs)
        // Sum(Var) = N * 100
        // Pairs = N*(N-1)/2
        // 2*Sum(Cov) = N*(N-1) * Cov_single
        // Cov_single = r * 10 * 10 = 100r

        const sumVar = numScales * (T_STD ** 2);
        const sumCov = (numScales * (numScales - 1)) * (ESTIMATED_CORRELATION * (T_STD ** 2));
        const compStd = Math.sqrt(sumVar + sumCov);

        console.log(`Comp ${comp.name}: Scales=${numScales}, Mean=${compMean.toFixed(2)}, Std=${compStd.toFixed(2)}`);

        newNorms.push({
            test_id: TARGET_TEST_ID,
            category_name: normalizeCategory('COMPETENCY', comp.name),
            mean_value: compMean,
            std_dev_value: compStd
        });
    }

    // 5. Total Norm (T-Score Summation Logic)
    // Total Raw = Sum of Competency T-Scores.
    // Each Competency T-Score: Mean=50, Std=10.
    const numComps = comps.length;
    const totalMean = numComps * T_MEAN;

    const TOTAL_CORR = 0.4;
    const totalVarSum = numComps * (T_STD ** 2);
    const totalCovSum = (numComps * (numComps - 1)) * (TOTAL_CORR * (T_STD ** 2));
    const totalStd = Math.sqrt(totalVarSum + totalCovSum);

    console.log(`TOTAL: Comps=${numComps}, Mean=${totalMean.toFixed(2)}, Std=${totalStd.toFixed(2)}`);

    newNorms.push({
        test_id: TARGET_TEST_ID,
        category_name: 'Total Score',
        mean_value: totalMean,
        std_dev_value: totalStd
    });

    // 6. Insert into DB
    console.log('Clearing existing norms for this test...');
    const { error: delErr } = await supabase.from('test_norms').delete().eq('test_id', TARGET_TEST_ID);
    if (delErr) console.error('Delete error:', delErr);

    const { error: insErr } = await supabase.from('test_norms').insert(newNorms);
    if (insErr) console.error('Insert Error:', insErr);
    else console.log(`Successfully inserted ${newNorms.length} norms.`);
}

function normalizeCategory(type: 'SCALE' | 'COMPETENCY', name: string) {
    if (type === 'SCALE') return name.startsWith('Scale_') ? name : `Scale_${name}`;
    if (type === 'COMPETENCY') return name.startsWith('Comp_') ? name : `Comp_${name}`;
    return name;
}

generateSamsungNorms();
