
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

const TARGET_EMAIL = 'prodaum6660@gmail.com';
const TEST_TITLE_LIKE = '%Sample Test: ver2%';

async function main() {
    console.log(`--- Seeding Data for ${TARGET_EMAIL} ---`);

    // 1. Get User
    const { data: users, error: uError } = await supabase.auth.admin.listUsers();
    if (uError) { console.error("Auth list error:", uError); return; }

    const user = users.users.find(u => u.email === TARGET_EMAIL);
    if (!user) { console.error(`User ${TARGET_EMAIL} not found.`); return; }
    console.log(`User Found: ${user.id}`);

    // 2. Get Test
    const { data: test } = await supabase
        .from('tests')
        .select('*')
        .like('title', TEST_TITLE_LIKE)
        .single();

    if (!test) { console.error("Test not found"); return; }
    console.log(`Test Found: ${test.title}`);

    // 3. Get Questions (Order)
    const { data: questions } = await supabase
        .from('test_questions')
        .select('question_id, questions ( id, category, is_reverse_scored )')
        .eq('test_id', test.id)
        .order('order_index');

    if (!questions || questions.length === 0) { console.error("No questions found"); return; }

    const qList = questions.map((q: any) => ({
        id: q.questions.id,
        category: q.questions.category || '기타',
        is_reverse: q.questions.is_reverse_scored
    }));

    // 4. Get Norms & Competencies & Scales logic
    const { data: normsData } = await supabase.from('test_norms').select('*').eq('test_id', test.id);
    const normMap: Record<string, { mean: number, stdDev: number }> = {};
    normsData?.forEach((n: any) => {
        normMap[n.category_name] = { mean: n.mean_value, stdDev: n.std_dev_value };
    });

    const { data: compData } = await supabase
        .from('competencies')
        .select('name, competency_scales(scale_name)')
        .eq('test_id', test.id);

    // 5. Get Current Max Attempt
    const { data: maxRes } = await supabase
        .from('test_results')
        .select('attempt_number')
        .eq('test_id', test.id)
        .eq('user_id', user.id)
        .order('attempt_number', { ascending: false })
        .limit(1)
        .maybeSingle();

    let nextAttempt = (maxRes?.attempt_number || 0) + 1;

    // 6. Define Scenarios
    const scenarios = [
        { label: 'Session 2 (Low)', range: [1, 2] },
        { label: 'Session 3 (Mid)', range: [3, 3] },
        { label: 'Session 4 (High)', range: [4, 5] }
    ];

    for (const scen of scenarios) {
        console.log(`\nGenerating ${scen.label}... (Attempt ${nextAttempt})`);

        // A. Generate Answers
        const answers_log: Record<string, number> = {};
        const qOrder: string[] = [];

        qList.forEach((q, idx) => {
            qOrder.push(q.id);
            // Random between range[0] and range[1]
            const val = Math.floor(Math.random() * (scen.range[1] - scen.range[0] + 1)) + scen.range[0];
            answers_log[idx.toString()] = val;
        });

        // B. Calculate Raw Scores (Scale)
        const scaleRaw: Record<string, number> = {};
        qList.forEach((q, idx) => {
            const rawVal = answers_log[idx.toString()];
            const score = q.is_reverse ? (6 - rawVal) : rawVal;

            scaleRaw[q.category] = (scaleRaw[q.category] || 0) + score;
        });

        // C. Calculate Scale T-Scores
        const scaleResults: Record<string, { raw: number, t_score: number }> = {};
        Object.entries(scaleRaw).forEach(([cat, raw]) => {
            let t = 50;
            if (normMap[cat] && normMap[cat].stdDev > 0) {
                const z = (raw - normMap[cat].mean) / normMap[cat].stdDev;
                t = Math.round((z * 10 + 50) * 100) / 100;
            }
            scaleResults[cat] = { raw, t_score: t };
        });

        // D. Competency T-Scores
        const compResults: Record<string, { t_score: number }> = {};
        compData?.forEach((comp: any) => {
            const memberScales = comp.competency_scales.map((cs: any) => cs.scale_name);
            const tList = memberScales.map((s: string) => scaleResults[s]?.t_score).filter((v: number) => v !== undefined);

            let avg = 50;
            if (tList.length > 0) {
                avg = tList.reduce((a: number, b: number) => a + b, 0) / tList.length;
            }
            compResults[comp.name] = { t_score: Math.round(avg * 100) / 100 };
        });

        // E. Total Score (NEW LOGIC: Sum of Competencies)
        let rawTotal = 0;
        const compNames = Object.keys(compResults);
        if (compNames.length > 0) {
            rawTotal = compNames.reduce((s, k) => s + compResults[k].t_score, 0);
        } else {
            rawTotal = Object.values(scaleResults).reduce((s, v) => s + v.t_score, 0);
        }

        // Precision
        rawTotal = Math.round(rawTotal * 100) / 100;

        // F. Final Total T-Score
        let finalT = 50;
        const totalNorm = normMap['TOTAL'];
        if (totalNorm && totalNorm.stdDev > 0) {
            const z = (rawTotal - totalNorm.mean) / totalNorm.stdDev;
            finalT = Math.round((z * 10 + 50) * 100) / 100;
        } else {
            // Fallback (shouldn't happen if migration worked, but safe to have)
            if (compNames.length > 0) {
                finalT = rawTotal / compNames.length;
            }
        }

        const finalInt = Math.round(finalT);

        // G. Insert
        const now = new Date();
        now.setMinutes(now.getMinutes() + nextAttempt); // Offset time slightly

        const payload = {
            test_id: test.id,
            user_id: user.id,
            attempt_number: nextAttempt,
            started_at: new Date().toISOString(),
            completed_at: now.toISOString(),
            answers_log: answers_log,
            questions_order: qOrder,
            elapsed_seconds: 600,
            // status: 'COMPLETED', // Column not found error, removing
            total_score: finalInt,
            t_score: finalInt,
            detailed_scores: {
                competencies: compResults,
                scales: scaleResults,
                total: { t_score: finalT },
                raw_total: rawTotal
            }
        };

        const { error } = await supabase.from('test_results').insert(payload);
        if (error) {
            console.error(`Error inserting attempt ${nextAttempt}:`, error);
        } else {
            console.log(`Success! Attempt ${nextAttempt} inserted. Score: ${finalInt} (RawTotal: ${rawTotal})`);
        }

        nextAttempt++;
    }

    console.log("Seeding complete.");
}

main();
