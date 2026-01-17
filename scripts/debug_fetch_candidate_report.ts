
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase URL or Service Key');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function main() {
    const email = 'paycmh@gmail.com';
    console.log(`Fetching data for: ${email}`);

    // 1. Get User ID from auth.users (via public users table if synced, or rpc if possible, but let's try 'users' table first)
    const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id, email')
        .eq('email', email)
        .single();

    if (userError) {
        console.error('Error fetching user:', userError);
        return;
    }

    if (!userData) {
        console.error('User not found in public.users');
        return;
    }

    console.log('User found:', userData);
    const userId = userData.id;

    // 2. Fetch Test Results
    const { data: results, error: resultsError } = await supabase
        .from('test_results')
        .select('*')
        .eq('user_id', userId);

    if (resultsError) {
        console.error('Error fetching test results:', resultsError);
    } else {
        console.log(`Found ${results.length} test results.`);
        results.forEach((r, i) => {
            console.log(`\nResult #${i + 1}:`);
            console.log(`ID: ${r.id}`);
            console.log(`Test ID: ${r.test_id}`);
            console.log(`Status: ${r.status}`);
            console.log(`Total Score: ${r.total_score}`);
            if (r.detailed_scores) {
                console.log(`Detailed Scores:`, JSON.stringify(r.detailed_scores, null, 2).substring(0, 1000) + '...');
            } else {
                console.log(`Detailed Scores: null (Old 'details': ${r.details})`);
            }
            if (r.answers_log) {
                if (Array.isArray(r.answers_log)) {
                    console.log(`Answers Log (Array, First 2):`, JSON.stringify(r.answers_log.slice(0, 2), null, 2));
                } else {
                    console.log(`Answers Log (Object, First 2 keys):`, JSON.stringify(Object.entries(r.answers_log).slice(0, 2), null, 2));
                }
            } else {
                console.log(`Answers Log: null`);
            }
        });

        // Extended Verification for Test ID: a724bab1-b7e2-4b99-a5a3-8ae47cd9411e
        if (results.length > 0) {
            const targetTestId = 'a724bab1-b7e2-4b99-a5a3-8ae47cd9411e';
            console.log(`\n--- Extended Verification for Test ID: ${targetTestId} ---`);

            // 1. Fetch Ordered Questions
            const { data: testQs, error: tqError } = await supabase
                .from('test_questions')
                .select('order_index, questions ( id, category, content, is_reverse_scored )')
                .eq('test_id', targetTestId)
                .order('order_index');

            if (tqError) console.error('Error fetching test_questions:', tqError);
            else console.log(`Fetched ${testQs?.length} questions.`);

            // 2. Fetch Norms (Local + Global)
            const GLOBAL_TEST_ID = '8afa34fb-6300-4c5e-bc48-bbdb74c717d8';
            const { data: rules } = await supabase
                .from('test_norms')
                .select('*')
                .in('test_id', [targetTestId, GLOBAL_TEST_ID]);

            console.log(`Fetched ${rules?.length} norms.`);

            // 3. Fetch Competencies
            const { data: comps } = await supabase
                .from('competencies')
                .select('id, name, competency_scales ( scale_name )')
                .eq('test_id', targetTestId);

            console.log(`Fetched ${comps?.length} competencies.`);

            // 4. Output Data for Manual Review
            if (testQs && testQs.length > 0) {
                console.log('\nSample Questions (First 5):');
                testQs.slice(0, 5).forEach((tq: any) => {
                    console.log(`[${tq.order_index}] ${tq.questions.category}: ${tq.questions.content} (Rev: ${tq.questions.is_reverse_scored})`);
                });
            }

            if (comps && comps.length > 0) {
                console.log('\nCompetencies:');
                comps.forEach((c: any) => {
                    console.log(`- ${c.name}: [${c.competency_scales.map((s: any) => s.scale_name).join(', ')}]`);
                });
            }
        }
    }

    // 3. Fetch Test Attempts (for raw answers)
    const { data: attempts, error: attemptsError } = await supabase
        .from('test_attempts')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

    if (attemptsError) {
        console.error('Error fetching test attempts:', attemptsError);
    } else {
        console.log(`\nFound ${attempts.length} test attempts.`);
        attempts.forEach((a, i) => {
            console.log(`\nAttempt #${i + 1}:`);
            console.log(`ID: ${a.id}`);
            console.log(`Test ID: ${a.test_id}`);
            console.log(`Status: ${a.status}`);
            console.log(`Progress:`, JSON.stringify(a.progress, null, 2).substring(0, 200) + '...');
        });
    }
}

main();
