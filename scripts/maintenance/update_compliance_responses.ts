
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function updateCompliance() {
    console.log("Searching for test 'NIS Customizing Test'...");
    const { data: tests } = await supabase.from('tests').select('id, title').ilike('title', '%NIS%Customizing%');
    const targetTest = tests?.[0];
    if (!targetTest) { console.error("Test not found"); return; }

    // 1. Get Compliance Items & Targets
    const { data: qData } = await supabase
        .from('test_questions')
        .select('questions(id, category, content)')
        .eq('test_id', targetTest.id);

    if (!qData) return;

    // Filter and Map Targets
    const complianceMap: Record<string, number> = {};
    const ncItems = qData.map((d: any) => d.questions).filter((q: any) => q.category === '지시불이행');

    console.log(`Found ${ncItems.length} Compliance Items.`);

    ncItems.forEach((q: any) => {
        let target = -1;
        if (q.content.includes("'매우 그렇다'")) target = 5;
        else if (q.content.includes("'그렇다'")) target = 4;
        else if (q.content.includes("'보통'") || q.content.includes("'보통이다'")) target = 3;
        else if (q.content.includes("'전혀 그렇지 않다'")) target = 1;
        else if (q.content.includes("'그렇지 않다'")) target = 2;

        if (target !== -1) {
            complianceMap[q.id] = target;
            console.log(`[${q.id}] Set Target: ${target}`);
        } else {
            console.warn(`[${q.id}] No target found in content: ${q.content}`);
        }
    });

    // 2. Fetch Seeded Results
    const { data: results } = await supabase
        .from('test_results')
        .select('id, answers_log')
        .eq('test_id', targetTest.id)
        .gte('attempt_number', 1000);

    if (!results || results.length === 0) {
        console.error("No seeded results found.");
        return;
    }

    console.log(`Updating ${results.length} seeded results...`);
    let updatedCount = 0;

    for (const res of results) {
        const answers = res.answers_log || {};

        // Overwrite Compliance Answers
        Object.entries(complianceMap).forEach(([qId, targetVal]) => {
            answers[qId] = targetVal;
        });

        const { error } = await supabase
            .from('test_results')
            .update({
                answers_log: answers,
                detailed_scores: null, // Clear detailed scores
                total_score: 0,
                t_score: 0
            })
            .eq('id', res.id);

        if (!error) updatedCount++;
    }

    console.log(`Successfully updated ${updatedCount} results.`);
}

updateCompliance();
