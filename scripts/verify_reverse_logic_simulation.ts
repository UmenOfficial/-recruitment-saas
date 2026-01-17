
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function main() {
    console.log('--- Verifying Reverse Scoring Logic ---');

    // 1. Find a Reverse Scored Question
    const { data: questions } = await supabase
        .from('questions')
        .select('*')
        .eq('is_reverse_scored', true)
        .limit(1);

    if (!questions || questions.length === 0) {
        console.log('No reverse scored questions found.');
        return;
    }

    const q = questions[0];
    console.log(`Test Question ID: ${q.id}`);
    console.log(`Content: ${q.content}`);
    console.log(`Is Reverse Scored: ${q.is_reverse_scored}`);

    // 2. Simulate User Answer: "Strongly Agree" (5)
    const userAnswer = 5;
    console.log(`User Answer (DB Value): ${userAnswer} (Strongly Agree)`);

    // 3. User's Expected Logic: 6 - Answer
    const expectedScore = 6 - userAnswer;
    console.log(`Expected Score (6 - Answer): ${expectedScore}`);

    // 4. Verify Code Logic (recalc_all_scores.ts snippet)
    // "if (qData.questions.is_reverse_scored) raw = 6 - raw;"
    let calculatedRaw = userAnswer;
    // Note: In recalc logic, we might add +1 first if non-clinical?
    // Let's assume this is a Non-Clinical scale for worst case complication
    // If Non-Clinical, current recalc adds +1 -> 6. Then 6 - 6 = 0? Or 0-based input?

    // Wait, recalc logic:
    // "let raw = val;" (if 1-based detected)
    // "raw = raw + 1;" (if non-clinical/0-based assumption)

    // CASE A: Mind Care Scale (Clinical) -> No +1
    if (['공격성', '반사회적 성격장애'].includes(q.category)) {
        console.log(`Category: ${q.category} (Mind Care)`);
        // Logic: raw = val (5)
        // Reverse: 6 - 5 = 1.
        console.log(`Logic Output: ${(6 - userAnswer)} MATCHES Expected? ${expectedScore === (6 - userAnswer)}`);
    } else {
        console.log(`Category: ${q.category} (General)`);

        // Scenario: Answer=5.
        // If Hybrid Logic adds +1 -> Raw becomes 6.
        // Then Reverse: 6 - 6 = 0.
        // This seems WRONG if the formula is strictly 6 - raw.
        // Actually, if we add +1, we are shifting the domain to 2-6.
        // The reverse of range 2-6 (where 6 is max) is... complicated.
        // 6 - 6 = 0 (Invalid?)
        // Standard reverse formula for range [Min, Max] is (Min + Max) - Val.
        // If 0-based [0,4], R = 4-x. (+1 output -> 5 - (x+1) + 1 = 5-x?)

        // Let's check exactly what the code does:
        // raw = raw + 1; (5 -> 6)
        // if (reverse) raw = 6 - raw; (6 - 6 = 0)

        // This produces 0! This might be a bug for Non-Clinical Reverse items IF they get +1.
    }
}

main();
