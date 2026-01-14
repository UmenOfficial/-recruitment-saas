
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function inspectLatestResult() {
    console.log('Fetching last 5 test results...');

    // Get latest results
    const { data: results, error } = await supabase
        .from('test_results')
        .select(`
            id, 
            created_at, 
            completed_at,
            test_id, 
            detailed_scores,
            total_score,
            t_score,
            users (full_name)
        `)
        .order('created_at', { ascending: false })
        .limit(5);

    if (error) {
        console.error('Error:', error);
        return;
    }

    if (!results || results.length === 0) {
        console.log('No results found.');
        return;
    }

    results.forEach((result: any, index: number) => {
        console.log(`\n--- Result #${index + 1} ---`);
        console.log(`ID: ${result.id}`);
        console.log(`User: ${result.users?.full_name}`);
        console.log(`Created: ${result.created_at}`);
        console.log(`Completed: ${result.completed_at ? result.completed_at : 'Not Completed'}`);
        console.log(`Total Score: ${result.total_score}`);
        console.log(`T-Score: ${result.t_score}`);

        const summary = result.detailed_scores;
        if (summary && Object.keys(summary).length > 0) {
            // Check for competency scores
            if (summary.competencies) {
                console.log('Competency Scores:', JSON.stringify(summary.competencies, null, 2));
            }

            // Check for scale scores
            if (summary.scales) {
                // Sort scores to help identification
                const entries = Object.entries(summary.scales).map(([k, v]: any) => ({ k, v }));
                entries.sort((a, b) => a.v - b.v);
                const bottom4 = entries.slice(0, 4);
                const top4 = entries.slice(-4).reverse(); // Highest first

                console.log('Bottom 4 Scores:', JSON.stringify(bottom4, null, 2));
                console.log('Top 4 Scores:', JSON.stringify(top4, null, 2));
            }
        } else {
            console.log('Detailed Scores: {} (Empty)');
        }
    });
}

inspectLatestResult();
