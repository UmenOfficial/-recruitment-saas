
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

// Target Norms
const TARGET_MEAN = 8.35;
const TARGET_SD = 0.55;

// Box-Muller
function randn_bm() {
    let u = 0, v = 0;
    while (u === 0) u = Math.random();
    while (v === 0) v = Math.random();
    return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

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

    for (let i = items.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [items[i], items[j]] = [items[j], items[i]];
    }

    // Add noise
    if (numItems > 1) {
        const noiseSwaps = 1;
        for (let n = 0; n < noiseSwaps; n++) {
            const i1 = Math.floor(Math.random() * numItems);
            const i2 = Math.floor(Math.random() * numItems);
            if (i1 !== i2 && items[i1] < 5 && items[i2] > 1) {
                items[i1]++;
                items[i2]--;
            }
        }
    }

    return items;
}

async function updateSelfValidation() {
    console.log("Searching for test 'NIS Customizing Test'...");
    const { data: tests } = await supabase.from('tests').select('id, title').ilike('title', '%NIS%Customizing%');
    const targetTest = tests?.[0];
    if (!targetTest) { console.error("Test not found"); return; }

    console.log(`Target Test: ${targetTest.title}`);

    // 1. Get Questions for '자기신뢰도검증'
    // Note: Category name might be '자기신뢰도검증' or '자기신뢰도' or 'Scale_...'
    // Check DB first clearly
    const { data: allQ } = await supabase
        .from('test_questions')
        .select('questions(id, category, is_reverse_scored)')
        .eq('test_id', targetTest.id);

    if (!allQ) return;

    const targetItems = allQ
        .map((row: any) => row.questions)
        .filter((q: any) => q.category && (q.category.includes('자기신뢰도') || q.category.includes('신뢰도검증')));

    if (targetItems.length === 0) {
        console.error("No items found for '자기신뢰도검증'");
        return;
    }

    console.log(`Found ${targetItems.length} items for '자기신뢰도검증'. Ids:`, targetItems.map((q: any) => q.id));

    // 2. Fetch Seeded Results
    const { data: results } = await supabase
        .from('test_results')
        .select('id, answers_log, attempt_number')
        .eq('test_id', targetTest.id)
        .gte('attempt_number', 1000);

    if (!results || results.length === 0) {
        console.error("No seeded results found (attempt >= 1000).");
        return;
    }

    console.log(`Updating ${results.length} seeded results...`);

    let updatedCount = 0;
    for (const res of results) {
        const answers = res.answers_log || {};

        // Generate Target Score for this user
        const userTarget = randn_bm() * TARGET_SD + TARGET_MEAN;
        const itemScores = generateItemScores(userTarget, targetItems.length);

        // Update Answers Loop
        targetItems.forEach((item: any, idx: number) => {
            const point = itemScores[idx];
            // Reverse Logic - DISABLED per user request
            // const finalVal = item.is_reverse_scored ? (6 - point) : point;
            const finalVal = point;
            answers[item.id] = finalVal;
        });

        const { error } = await supabase
            .from('test_results')
            .update({
                answers_log: answers,
                detailed_scores: null, // Clear detailed scores to invalidate cache/force recalc
                total_score: 0,
                t_score: 0
            })
            .eq('id', res.id);

        if (!error) updatedCount++;
    }

    console.log(`Successfully updated ${updatedCount} results.`);
}

updateSelfValidation();
