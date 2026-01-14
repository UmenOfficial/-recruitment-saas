
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

// 1. Target Norms (From Image seed script)
// We use these to calc T-Scores.
const TARGET_NORMS: Record<string, { mean: number, sd: number }> = {
    '불안/우울 장애': { mean: 11.06, sd: 0.58 }, // Use '불안/우울 장애' matching DB key if exists. Check both keys below.
    '불안/우울장애': { mean: 11.06, sd: 0.58 }, // Variant
    '공격성': { mean: 10.98, sd: 0.64 },
    '조현형 성격장애': { mean: 11.08, sd: 0.65 },
    '조현형성격장애': { mean: 11.08, sd: 0.65 }, // Variant
    '반사회적 성격장애': { mean: 11.29, sd: 0.60 },
    '경계선 성격장애': { mean: 11.09, sd: 0.65 },
    '의존성 성격장애': { mean: 10.85, sd: 0.68 },
    '편집성 성격장애': { mean: 10.93, sd: 0.75 },
    '편접성 성격장애': { mean: 10.93, sd: 0.75 } // Variant
};

const MIND_CARE_KEYS = [
    '불안/우울 장애',
    '공격성',
    '조현형성격장애',
    '반사회적 성격장애',
    '경계선 성격장애',
    '의존성 성격장애',
    '편접성 성격장애'
];

function calculateT(raw: number, mean: number, sd: number) {
    if (!sd) return 50;
    const t = 50 + 10 * ((raw - mean) / sd);
    return Math.max(0, Math.min(100, t));
}

async function analyzeMindCare() {
    console.log("Fetching Test & Questions...");
    const { data: tests } = await supabase.from('tests').select('id').ilike('title', '%NIS%Customizing%');
    const testId = tests?.[0]?.id;
    if (!testId) { console.error("Test not found"); return; }

    const { data: qData } = await supabase
        .from('test_questions')
        .select('questions(id, category, content)')
        .eq('test_id', testId);

    if (!qData) return;
    const questions = qData.map((d: any) => d.questions);

    // Map Questions to Scales
    const scaleMap: Record<string, string[]> = {};
    questions.forEach((q: any) => {
        // Try to match one of our keys
        // DB categories might slightly differ (spaces etc).
        // Let's normalize. 
        // e.g. "불안/우울장애" vs "불안/우울 장애"

        let cat = q.category;
        // Search if cat is in MIND_CARE_KEYS or variants
        // Simple mapping based on includes
        if (cat.includes('불안') && cat.includes('우울')) cat = '불안/우울 장애';
        else if (cat.includes('조현')) cat = '조현형성격장애';
        else if (cat.includes('반사회')) cat = '반사회적 성격장애';
        else if (cat.includes('경계선')) cat = '경계선 성격장애';
        else if (cat.includes('의존성')) cat = '의존성 성격장애';
        else if (cat.includes('편집') || cat.includes('편접')) cat = '편접성 성격장애'; // Treat as ONE

        // Only if it matches our list
        if (MIND_CARE_KEYS.includes(cat) || cat === '공격성') {
            if (!scaleMap[cat]) scaleMap[cat] = [];
            scaleMap[cat].push(q.id);
        }
    });

    console.log("Mapped Scales:", Object.keys(scaleMap));

    // Fetch Seeded Results
    const { data: results } = await supabase
        .from('test_results')
        .select('id, answers_log')
        .eq('test_id', testId)
        .gte('attempt_number', 1000);

    if (!results) return;
    console.log(`Analyzing ${results.length} results...`);

    const stats: Record<string, { count: number }> = {};
    MIND_CARE_KEYS.forEach(k => stats[k] = { count: 0 });

    results.forEach(res => {
        const answers = res.answers_log || {};

        MIND_CARE_KEYS.forEach(key => {
            const qIds = scaleMap[key] || [];
            if (qIds.length === 0) return;

            // Calc Raw
            let rawSum = 0;
            qIds.forEach(id => {
                rawSum += (answers[id] || 0); // Assuming already reverse scored correctly by now? YES. Or direct.
                // wait, seeded values are raw answers. 
                // For these scales, are there reverse items?
                // Usually NO for clinical scales, but check mapping if possible.
                // Assuming raw sum is correct.
            });

            // Calc T
            const normKey = key === '편접성 성격장애' ? '편집성 성격장애' : key; // Map back to target keys
            // Also handle variants in TARGET_NORMS keys
            // Try explicit lookup
            let norm = TARGET_NORMS[key];
            if (!norm && key === '편접성 성격장애') norm = TARGET_NORMS['편접성 성격장애'] || TARGET_NORMS['편집성 성격장애'];
            if (!norm && key === '불안/우울 장애') norm = TARGET_NORMS['불안/우울 장애'] || TARGET_NORMS['불안/우울장애'];
            if (!norm && key === '조현형성격장애') norm = TARGET_NORMS['조현형성격장애'] || TARGET_NORMS['조현형 성격장애'];

            if (norm) {
                const t = calculateT(rawSum, norm.mean, norm.sd);
                if (t >= 65) {
                    stats[key].count++;
                }
            }
        });
    });

    console.log("\n=== Mind Care Analysis (Fail Condition: T-Score >= 65) ===");
    console.log(`Total Samples: ${results.length}`);
    MIND_CARE_KEYS.forEach(key => {
        const c = stats[key].count;
        const p = ((c / results.length) * 100).toFixed(1);
        console.log(`- ${key}: ${c}명 (${p}%)`);
    });
}

analyzeMindCare();
