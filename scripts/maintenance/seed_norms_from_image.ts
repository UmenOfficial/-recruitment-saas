
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

// Target Norms from User Images
const TARGETS: Record<string, { mean: number, sd: number }> = {
    '개방성': { mean: 18.33, sd: 0.91 },
    '개선성': { mean: 18.45, sd: 0.73 },
    '객관성': { mean: 18.39, sd: 0.82 },
    '거시성': { mean: 19.46, sd: 0.80 },
    '겸손성': { mean: 19.42, sd: 0.88 },
    '경쟁성': { mean: 18.70, sd: 0.66 },
    '계획성': { mean: 18.52, sd: 0.86 },
    '공감성': { mean: 19.23, sd: 0.70 },
    '관계성': { mean: 17.43, sd: 0.84 },
    '긍정성': { mean: 17.41, sd: 0.76 },
    '도전성': { mean: 18.40, sd: 0.67 },
    '몰입성': { mean: 17.39, sd: 0.87 },
    '민감성': { mean: 18.50, sd: 0.81 },
    '분석성': { mean: 18.52, sd: 0.88 },
    '비판성': { mean: 18.22, sd: 0.89 },
    '설득성': { mean: 18.53, sd: 0.88 },
    '세밀성': { mean: 18.41, sd: 0.64 },
    '수용성': { mean: 17.18, sd: 0.70 },
    '신중성': { mean: 17.23, sd: 0.78 },
    '실행성': { mean: 17.43, sd: 0.77 },
    '윤리성': { mean: 17.49, sd: 0.94 },
    '인내성': { mean: 18.80, sd: 0.82 },
    '일관성': { mean: 18.52, sd: 0.67 },
    '자발성': { mean: 18.55, sd: 0.86 },
    '적응성': { mean: 19.56, sd: 0.69 },
    '전문성': { mean: 17.45, sd: 0.87 },
    '주도성': { mean: 18.66, sd: 0.65 },
    '준수성': { mean: 17.50, sd: 0.83 },
    '창의성': { mean: 17.33, sd: 0.76 },
    '책임성': { mean: 17.45, sd: 0.78 },
    '헌신성': { mean: 17.61, sd: 0.81 },
    '협동성': { mean: 18.34, sd: 0.80 },
    '회복성': { mean: 18.43, sd: 0.70 },
    '거짓말': { mean: 9.86, sd: 0.72 },
    '지시불이행': { mean: 15.57, sd: 0.30 },
    '자기신뢰도검증': { mean: 39.33, sd: 0.55 },
    '불안/우울장애': { mean: 11.06, sd: 0.58 },
    '공격성': { mean: 10.98, sd: 0.64 },
    '조현형 성격장애': { mean: 11.08, sd: 0.65 },
    '반사회적 성격장애': { mean: 11.29, sd: 0.60 },
    '경계선 성격장애': { mean: 11.09, sd: 0.65 },
    '의존성 성격장애': { mean: 10.85, sd: 0.68 },
    '편집성 성격장애': { mean: 10.93, sd: 0.75 }
};

// Box-Muller Transform for Normal Distribution
function randn_bm() {
    let u = 0, v = 0;
    while (u === 0) u = Math.random();
    while (v === 0) v = Math.random();
    return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

// Generate a random integer distribution that sums to targetSum
// This is non-trivial. Simplified approach:
// 1. Calculate ideal average per item.
// 2. Generate items using Gaussian around average.
// 3. Adjust to match sum exactly?
// Better:
// Generate 'k' items from N(mu_i, sigma_i).
// Sum them.
// If not close enough?
// Actually we need the AGGREGATE of 300 users to match Mean/SD.
// So for each user, we sample a "Target Scale Score" from N(TargetMean, TargetSD).
// Then we force the items to sum to that Score.
function generateItemScores(targetTotal: number, numItems: number): number[] {
    // 1. Clamp targetTotal to possible range [numItems*1, numItems*5]
    const minPossible = numItems * 1;
    const maxPossible = numItems * 5;
    const clampedTotal = Math.max(minPossible, Math.min(maxPossible, Math.round(targetTotal)));

    // 2. Distribute total into items
    // Start with base
    const base = Math.floor(clampedTotal / numItems);
    let remainder = clampedTotal % numItems;

    const items = new Array(numItems).fill(base);
    // Distribute remainder
    for (let i = 0; i < remainder; i++) {
        items[i]++;
    }

    // Shuffle to randomize which items get the extra point
    for (let i = items.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [items[i], items[j]] = [items[j], items[i]];
    }

    // Add some noise? (e.g. +1/-1 swap) to make it look less artificial "all 3s"
    // We want realistic patterns.
    // Try to spread variance slightly if possible without changing sum.
    // e.g. change (3,3) to (2,4) if valid.
    const noiseSwaps = 2;
    for (let n = 0; n < noiseSwaps; n++) {
        const i1 = Math.floor(Math.random() * numItems);
        const i2 = Math.floor(Math.random() * numItems);
        if (i1 !== i2) {
            // Try increasing i1, decreasing i2
            if (items[i1] < 5 && items[i2] > 1) {
                items[i1]++;
                items[i2]--;
            }
        }
    }

    return items;
}

async function seedData() {
    console.log("Starting Seeding for NIS Customizing Test...");

    // 1. Find Test
    const { data: tests } = await supabase.from('tests').select('id, title').ilike('title', '%NIS%Customizing%');
    const targetTest = tests?.[0];
    if (!targetTest) { console.error("Test not found"); return; }
    console.log(`Test: ${targetTest.title}`);

    // 2. Fetch Questions
    const { data: questions } = await supabase
        .from('test_questions')
        .select('question_id, questions(id, category, is_reverse_scored)')
        .eq('test_id', targetTest.id);

    if (!questions || questions.length === 0) { console.error("No questions found"); return; }

    // Map Category -> Question[]
    const scaleMap: Record<string, { id: string, rev: boolean }[]> = {};
    const allQIds: string[] = [];

    questions.forEach((row: any) => {
        const q = row.questions;
        if (!q || !q.category) return;
        if (!scaleMap[q.category]) scaleMap[q.category] = [];
        scaleMap[q.category].push({
            id: q.id,
            rev: q.is_reverse_scored || false
        });
        allQIds.push(q.id);
    });

    console.log(`Mapped ${Object.keys(scaleMap).length} scales.`);

    // 3. Generate 300 Users
    // Actually we don't need real users, just test_results rows.
    // But test_results needs 'user_id'. 
    // We can use the SAME user 'test_candidate' multiple times with different attempts?
    // Or just create dummy users.
    // User requested "Input 300 responses".
    // Using one user with 300 attempts is easiest to clean up later.
    // Fetch test user
    const { data: user } = await supabase.from('users').select('id').eq('email', 'test_candidate@umen.cloud').single();
    if (!user) { console.error("Test User not found"); return; }

    const BATCH_SIZE = 50;
    const TOTAL_N = 300;
    let insertedCount = 0;

    for (let batch = 0; batch < TOTAL_N / BATCH_SIZE; batch++) {
        const rows: any[] = [];

        for (let i = 0; i < BATCH_SIZE; i++) {
            const answers_log: Record<string, number> = {};

            // Generate answers for each scale
            Object.entries(scaleMap).forEach(([cat, items]) => {
                const target = TARGETS[cat];
                if (!target) {
                    // console.warn(`No target for scale ${cat}, using default`);
                    // Fallback: Mean 18, SD 2
                    // Or skip?
                    return;
                }

                // 1. Sample a Target Score for this user on this scale
                const targetScore = randn_bm() * target.sd + target.mean;

                // 2. Distribute into items
                const itemScores = generateItemScores(targetScore, items.length);

                // 3. Assign
                items.forEach((item, idx) => {
                    const point = itemScores[idx]; // This is the Score Point (1-5)

                    // Convert to Raw Answer
                    // If Reverse: Answer = 6 - Point
                    // If Normal: Answer = Point
                    const answer = item.rev ? (6 - point) : point;
                    answers_log[item.id] = answer;
                });
            });

            // Fill any missing questions (norm-less scales?) with 3
            // Assuming strict map coverage.

            rows.push({
                test_id: targetTest.id,
                user_id: user.id,
                attempt_number: 1000 + insertedCount + i + 1, // Start from 1000 to avoid conflicts
                answers_log: answers_log,
                completed_at: new Date().toISOString(),
                elapsed_seconds: 600,
                total_score: 0, // Will be calculated by system later? No, we insert RAW. System calculates norms FROM this.
                t_score: 0,
                // detailed_scores: {} // Optional, not needed for norm calc
            });
        }

        const { error } = await supabase.from('test_results').insert(rows);
        if (error) {
            console.error("Insert error:", error.message);
        } else {
            insertedCount += rows.length;
            console.log(`Inserted ${insertedCount} / ${TOTAL_N}`);
        }
    }

    console.log("Seeding Complete.");
}

seedData();
