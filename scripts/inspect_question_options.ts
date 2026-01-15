
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function inspectOptions() {
    console.log("--- Inspecting Question Options ---");

    // 1. Inspect the reported question with looser search
    const { data: qData, error: qError } = await supabaseAdmin
        .from('questions')
        .select('id, content, options')
        .ilike('content', '%분석한다%');

    if (qData && qData.length > 0) {
        console.log(`\n🔍 Found '분석한다' Questions:`);
        qData.forEach(q => {
            console.log(`   - [${q.id}] "${q.content}"`);
            console.log(`     Options: ${JSON.stringify(q.options)}`);
        });
    }

    // 2. Search for the specific weird option text "그렇군요" or "매우 매우"
    console.log("\n🔍 Searching for questions with weird option text...");
    // Supabase ilike on jsonb/array is tricky, so we fetch and filter (it's small data)

    // Fetch all questions linked to Standard Personality Test
    // First get the test id
    const { data: tests } = await supabaseAdmin.from('tests').select('id').ilike('title', '%표준 인성%').single();
    if (!tests) { console.log("Test not found"); return; }

    const testId = tests.id;
    console.log(`ℹ️ Standard Personality Test ID: ${testId}`);

    const { data: linkedQs } = await supabaseAdmin
        .from('test_questions')
        .select('question_id, questions(id, content, options)')
        .eq('test_id', testId);

    if (!linkedQs) return;

    let badOptionCount = 0;
    const questionsToFix: string[] = [];

    linkedQs.forEach((item: any) => {
        const q = item.questions;
        if (!q) return;

        const opts = q.options;
        const optsStr = JSON.stringify(opts);

        // Check for the specific weird values user saw
        if (optsStr.includes("그렇군요") || optsStr.includes("그렇지 않으면") || optsStr.includes("매우 매우")) {
            console.log(`\n🚨 FOUND WEIRD OPTION! [${q.id}] "${q.content}"`);
            console.log(`   -> ${optsStr}`);
        }

        // Check for Empty Strings (which I saw in previous log)
        if (optsStr.includes('""') || optsStr === '["","","","",""]') {
            // console.log(`   (Empty Options) [${q.id}] "${q.content}"`); // Too noisy if many
            questionsToFix.push(q.id);
        }

        // Check for Null (Should be using default)
        if (opts === null) {
            // This is actually GOOD, frontend uses default.
        } else {
            // Non-null, non-standard options in a personality test?
            // If it's NOT the standard list, it's suspect.
            const standardOptions = ["전혀 그렇지 않다", "그렇지 않다", "보통이다", "그렇다", "매우 그렇다"];
            if (JSON.stringify(opts) !== JSON.stringify(standardOptions)) {
                badOptionCount++;
                questionsToFix.push(q.id);
            }
        }
    });

    console.log(`\n📊 Analysis of Personality Test Questions (${linkedQs.length} total):`);
    console.log(`   - Questions with Non-Standard Options: ${badOptionCount}`);
    console.log(`   - (These should probably be reset to NULL or Standard)`);

}

inspectOptions();
