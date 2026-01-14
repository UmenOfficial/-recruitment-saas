
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function main() {
    console.log('--- Seeding Mock Results for Sample Test ---');

    // 1. Get Sample Test ID
    const { data: tests } = await supabase
        .from('tests')
        .select('id')
        .ilike('title', '%Sample Test%')
        .limit(1);

    if (!tests || tests.length === 0) {
        console.error('Sample Test not found');
        return;
    }
    const testId = tests[0].id;

    // 1.5 Get Defined Competencies
    const { data: compDefs } = await supabase.from('competencies').select('name').eq('test_id', testId);
    const validCompNames = compDefs?.map(c => c.name) || ['성취지향', '조직적합']; // Fallback if none
    console.log('Seeding using competencies:', validCompNames);

    // 2. Get a valid user (or create/pick one) to associate with.
    // Ideally we distribute across multiple users, or just use one user with multiple attempts (though logic prefers attempt=1).
    // The previous logic filters attempt_number=1. So we need DIFFERENT users.
    // Let's fetch some users.
    const { data: users } = await supabase.from('users').select('id').limit(20);

    if (!users || users.length < 5) {
        console.error('Not enough users to seed norms (need unique users for attempt=1)');
        return;
    }

    // 2.5 Clean up existing results for this test to avoid mixing keys
    await supabase.from('test_results').delete().eq('test_id', testId);
    console.log('Cleaned up old results.');

    console.log(`Seeding results for ${users.length} users...`);

    const resultsToInsert = users.map((user, idx) => {
        // Random scores
        const rel = 10 + Math.floor(Math.random() * 20); // 10-29
        const compScores: any = {};
        const rawTotal = 0;

        // 1. Generate Scale Scores
        // Scales for this test: "신중성", "관계성" (from debug output)
        // Let's generate for "신중성", "관계성", "설득성" (just in case extra)
        const scaleNames = ["신중성", "관계성", "설득성"];
        const scalesData: any = {};

        scaleNames.forEach(s => {
            // Raw: 10-29. T-Score: 30-70 (N(50, 10))
            const raw = 10 + Math.floor(Math.random() * 20);
            const t_score = Math.floor(30 + Math.random() * 40); // 30-70 range
            scalesData[s] = { raw, t_score };
        });

        // 2. Calculate "신중한 관계수립" (Competency)
        // Logic: Competency Raw = Sum of Member Scale T-Scores.
        // Members: 신중성, 관계성
        const compRaw = (scalesData['신중성']?.t_score || 50) + (scalesData['관계성']?.t_score || 50);
        // Comp T-Score: also around 50 usually, but let's mock it
        const compT = Math.floor(30 + Math.random() * 40);

        compScores['신중한 관계수립'] = { raw: compRaw, t_score: compT };

        // 3. Calculate Total
        // Logic: Total Raw = Sum of Competency T-Scores
        // Only 1 Comp: 신중한 관계수립
        const totalRaw = compT;

        // Final Total T-Score
        const finalTotalT = Math.floor(30 + Math.random() * 40);

        return {
            test_id: testId,
            user_id: user.id,
            attempt_number: 1, // Important for norm calc
            completed_at: new Date().toISOString(),
            detailed_scores: {
                scales: scalesData,
                competencies: compScores,
                raw_total: totalRaw,
                total: { t_score: finalTotalT }
            }
        };
    });

    // 3. Insert (using upset to overwrite if exists for attempt 1)
    const { error } = await supabase.from('test_results').upsert(resultsToInsert, { onConflict: 'user_id, test_id, attempt_number' });

    if (error) {
        console.error('Insert failed:', error);
    } else {
        console.log('Successfully seeded 20 mock results with variance.');
    }
}

main();
