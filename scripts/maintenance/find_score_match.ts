
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function findSpecificScore() {
    console.log('Searching for results with T-Score 23 in Open-Heart or 개방성...');

    // We cannot easily query inside JSONB for deep values with Supabase filter syntax universally
    // So we fetch the last 20 results and filter in memory. efficient enough for debug.
    const { data: results, error } = await supabase
        .from('test_results')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

    if (error) {
        console.error('Error:', error);
        return;
    }

    const matches = results.filter((r: any) => {
        const scales = r.detailed_scores?.scales;
        if (!scales) return false;
        const s = scales['개방성'];
        return s && s.t_score >= 22 && s.t_score <= 24;
    });

    console.log(`Found ${matches.length} matches.`);

    matches.forEach((result: any, index: number) => {
        console.log(`\n--- Match #${index + 1} ---`);
        console.log(`ID: ${result.id}`);
        console.log(`User: ${result.users?.full_name}`);
        console.log(`Created: ${result.created_at}`);
        console.log(`Total Score: ${result.total_score}`);

        const summary = result.detailed_scores;
        if (summary.competencies) {
            console.log('Competency Scores:', JSON.stringify(summary.competencies, null, 2));
        }
        if (summary.scales) {
            console.log('Openness:', JSON.stringify(summary.scales['개방성'], null, 2));
        }
    });
}

findSpecificScore();
