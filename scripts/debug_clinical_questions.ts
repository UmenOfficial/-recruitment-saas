
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
const TARGET_USER_EMAIL = 'zoellanne44@gmail.com';
const TARGET_CATEGORY = '반사회적 성격장애';

async function debugClinical() {
    console.log(`--- Debugging Questions for ${TARGET_CATEGORY} ---`);

    // 1. Fetch User
    const { data: users } = await supabase.from('users').select('id, email').eq('email', TARGET_USER_EMAIL);
    if (!users || users.length === 0) { console.log('User not found'); return; }
    const user = users[0];

    // 2. Fetch Latest Result
    const { data: results } = await supabase
        .from('test_results')
        .select('id, answers_log, test_id')
        .eq('user_id', user.id)
        .order('completed_at', { ascending: false })
        .limit(1);

    if (!results || results.length === 0) { console.log('No results.'); return; }
    const result = results[0];
    const testId = result.test_id;

    // 3. Fetch Questions for Category
    const { data: questions } = await supabase
        .from('questions')
        .select('id, content, is_reverse_scored')
        .eq('category', TARGET_CATEGORY);

    if (!questions || questions.length === 0) { console.log('No questions found.'); return; }

    console.log(`Found ${questions.length} questions.`);

    // 4. Check Answers
    // console.log('Log:', result.answers_log);
    const answers = result.answers_log as any;
    let totalRaw = 0;

    for (const q of questions) {
        // Find answer in log (by ID or index)
        let rawVal = 0;

        // Log is usually object { qId: val }
        if (answers[q.id] !== undefined) {
            rawVal = answers[q.id];
        } else {
            console.log(`  [MISSING ANSWER] Q: ${q.content}`);
            continue;
        }

        // Logic check
        // DB stores 0-4 usually? Or 1-5?
        // Let's assume logic TS uses +1.
        // Let's print raw value from DB.

        // Scoring Logic Simulation
        // In recalc script: raw = (val (0-4)) + 1 -> 1-5.
        // If reverse: 6 - raw.

        const answerOneBased = Number(rawVal) + 1;
        let final = answerOneBased;
        if (q.is_reverse_scored) final = 6 - final;

        totalRaw += final;

        console.log(`Q: "${q.content}" (Reverse: ${q.is_reverse_scored})`);
        console.log(`   - Raw DB: ${rawVal} (-> ${answerOneBased})`);
        console.log(`   - Final Score: ${final}`);
    }

    console.log(`Total Calculated Raw: ${totalRaw}`);

    // 5. Compare with Expected T
    // Mean 8.8, SD 2
    // T = 50 + 10 * (Raw - 8.8)/2
    const mean = 8.8;
    const sd = 2.0;
    const t = 50 + 10 * ((totalRaw - mean) / sd);
    console.log(`Estimated T-Score: ${t.toFixed(1)}`);
}

debugClinical();
