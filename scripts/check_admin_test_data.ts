
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load env vars
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error("Missing Supabase credentials");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkAdminTestData() {
    console.log("Searching for Admin Test Data (Attempts 1-30)...");

    // 1. Find the NIS test ID
    const { data: tests } = await supabase
        .from('tests')
        .select('id, title')
        .ilike('title', '%NIS Customizing%')
        .limit(1);

    if (!tests || tests.length === 0) {
        console.error("Could not find NIS Customizing Test");
        return;
    }
    const testId = tests[0].id; // 77ff6903-41f4-4b1f-97e2-8f42746b10e4

    // 2. Find User with many attempts
    // We'll look for results with high attempt numbers to identify the user
    const { data: highAttempts } = await supabase
        .from('test_results')
        .select('user_id, attempt_number')
        .eq('test_id', testId)
        .gte('attempt_number', 20) // Look for someone with at least 20 attempts
        .limit(5);

    if (!highAttempts || highAttempts.length === 0) {
        console.log("No user found with > 20 attempts for this test.");
        return;
    }

    // Get the most frequent user_id
    const userId = highAttempts[0].user_id;

    // Optional: Get User Email (if meaningful, otherwise just ID)
    // Note: user_id implies we might need to look at 'candidates' or 'users' table depending on auth setup.
    // Assuming 'test_results.user_id' links to 'auth.users' or similar. 
    // We'll just stick to the ID for now or try to fetch email if possible.

    console.log(`Identified Target User ID: ${userId}`);

    // 3. Fetch Attempts 1-30 for this user
    const { data: results, error } = await supabase
        .from('test_results')
        .select('id, attempt_number, total_score, detailed_scores, created_at')
        .eq('test_id', testId)
        .eq('user_id', userId)
        .lte('attempt_number', 30)
        .order('attempt_number', { ascending: true });

    if (error) {
        console.error("Error fetching results:", error);
        return;
    }

    console.log(`\nFound ${results.length} attempts for User ${userId}.`);
    console.log("--------------------------------------------------------------------------------");
    console.log("| Attempt | Total T-Score | Details (Top 2 Competencies)                 |");
    console.log("--------------------------------------------------------------------------------");

    results.forEach((r: any) => {
        const score = r.total_score; // likely the T-score or raw depending on implementation

        // Debug structure for the first item
        if (r.attempt_number === 1) {
            console.log("Debug Attempt 1 Log:", JSON.stringify(r.answers_log, null, 2));
        }

        // Parse Breakdown from detailed_scores
        const breakdown: any = r.detailed_scores;
        let compStr = "";
        if (breakdown && breakdown.competencies) {
            compStr = Object.entries(breakdown.competencies)
                .slice(0, 2)
                .map(([k, v]: [string, any]) => `${k}:${v?.t_score?.toFixed(1) || v?.raw}`)
                .join(", ");
        } else {
            compStr = "No Breakdown Data";
        }

        console.log(`| ${r.attempt_number.toString().padEnd(7)} | ${score.toString().padEnd(13)} | ${compStr}`);
    });
    console.log("--------------------------------------------------------------------------------");
}

checkAdminTestData();
