
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

// Target Norms (Mean/SD)
const NORMS: Record<string, { mean: number, sd: number }> = {
    '불안/우울 장애': { mean: 11.06, sd: 0.58 },
    '공격성': { mean: 10.98, sd: 0.64 },
    '의존성 성격장애': { mean: 10.85, sd: 0.68 },
    '경계선 성격장애': { mean: 11.09, sd: 0.65 }
};

// Target Fail Rates (approx counts for 300 users)
// 2.3% of 300 = 6.9 -> 7
// 2.5% of 300 = 7.5 -> 8
// 2.2% of 300 = 6.6 -> 7
// 1.8% of 300 = 5.4 -> 5
const TARGET_COUNTS: Record<string, number> = {
    '불안/우울 장애': 7,
    '공격성': 8,
    '의존성 성격장애': 7,
    '경계선 성격장애': 5
};

// Helper: Distribute total score into items
function generateItemScores(targetTotal: number, numItems: number): number[] {
    const minPossible = numItems * 1;
    const maxPossible = numItems * 5;
    const clampedTotal = Math.max(minPossible, Math.min(maxPossible, Math.round(targetTotal)));

    const base = Math.floor(clampedTotal / numItems);
    let remainder = clampedTotal % numItems;

    const items = new Array(numItems).fill(base);
    for (let i = 0; i < remainder; i++) {
        items[i]++;
    }
    // Shuffle
    for (let i = items.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [items[i], items[j]] = [items[j], items[i]];
    }
    return items;
}

async function adjustMindCare() {
    console.log("Searching for test 'NIS Customizing Test'...");
    const { data: tests } = await supabase.from('tests').select('id').ilike('title', '%NIS%Customizing%');
    const testId = tests?.[0]?.id;
    if (!testId) { console.error("Test not found"); return; }

    console.log("Fetching Questions...");
    const { data: qData } = await supabase
        .from('test_questions')
        .select('questions(id, category)')
        .eq('test_id', testId);

    if (!qData) return;

    // Map Categories
    const scaleMap: Record<string, string[]> = {};
    qData.forEach((d: any) => {
        const q = d.questions;
        let cat = q.category;
        if (cat.includes('불안') && cat.includes('우울')) cat = '불안/우울 장애';
        else if (cat.includes('경계선')) cat = '경계선 성격장애';
        else if (cat.includes('의존성')) cat = '의존성 성격장애';
        // '공격성' is usually exact match

        if (TARGET_COUNTS[cat]) {
            if (!scaleMap[cat]) scaleMap[cat] = [];
            scaleMap[cat].push(q.id);
        }
    });

    // Fetch Seeded Results
    console.log("Fetching 300 seeded results...");
    const { data: results } = await supabase
        .from('test_results')
        .select('id, answers_log')
        .eq('test_id', testId)
        .gte('attempt_number', 1000);

    if (!results || results.length === 0) return;

    // Process each target scale
    for (const [scale, targetCount] of Object.entries(TARGET_COUNTS)) {
        const qIds = scaleMap[scale];
        if (!qIds || qIds.length === 0) {
            console.warn(`No questions found for ${scale}`);
            continue;
        }

        const norm = NORMS[scale];
        // Calculate Cutoff for T=65
        // T = 50 + 10(z) -> 65 = 50 + 10z -> 15 = 10z -> z = 1.5
        // Raw = Mean + 1.5 * SD
        const cutoffRaw = norm.mean + (1.5 * norm.sd);

        console.log(`\nAdjusting '${scale}'...`);
        console.log(`Target Count: ${targetCount} | Cutoff Raw > ${cutoffRaw.toFixed(2)} (Mean ${norm.mean})`);

        // Shuffle results to pick random victims
        const shuffled = [...results].sort(() => Math.random() - 0.5);

        // High Group
        const highGroup = shuffled.slice(0, targetCount);
        // Normal Group
        const normalGroup = shuffled.slice(targetCount);

        // Update High Group (Score > Cutoff)
        // Aim for Cutoff + 0.5 to be safe (or +1.0)
        // But max 5 * numItems
        const highTarget = Math.ceil(cutoffRaw + 0.5);

        for (const res of highGroup) {
            const items = generateItemScores(highTarget, qIds.length);
            const answers = res.answers_log || {};
            qIds.forEach((qid, idx) => answers[qid] = items[idx]);

            // We update in memory first, then push DB update
            await supabase.from('test_results')
                .update({ answers_log: answers, detailed_scores: null, total_score: 0, t_score: 0 })
                .eq('id', res.id);
        }

        // Update Normal Group (Score <= Mean)
        // To be safe, set them to Mean (or Mean - small delta)
        // User requested target rate. If everyone else is Mean (T=50), they are safe.
        // But we previously had high failure rates. We MUST reset them to Mean.
        const normalTarget = Math.round(norm.mean);

        // Batch update efficiently? Or loop. 300 is small enough to loop.
        for (const res of normalGroup) {
            const items = generateItemScores(normalTarget, qIds.length);
            const answers = res.answers_log || {};
            qIds.forEach((qid, idx) => answers[qid] = items[idx]);

            await supabase.from('test_results')
                .update({ answers_log: answers, detailed_scores: null, total_score: 0, t_score: 0 })
                .eq('id', res.id);
        }
    }

    console.log("\nAdjustments Complete.");
}

adjustMindCare();
