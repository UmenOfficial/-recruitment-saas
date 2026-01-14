
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
    console.error('Missing environment variables');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

async function inspectReport() {
    const reportId = 'a9cee6a9-b11b-421a-bc97-ed99414a8778';

    console.log(`Inspecting Test Result ID: ${reportId}`);

    const { data: result, error } = await supabase
        .from('test_results')
        .select(`
            *,
            users (email, full_name),
            tests (title)
        `)
        .eq('id', reportId)
        .single();

    if (error) {
        console.error('Error fetching result:', error);
        return;
    }

    if (!result) {
        console.error('Result not found');
        return;
    }

    console.log('User:', result.users?.email, result.users?.full_name);
    console.log('Total Score (DB):', result.total_score);
    console.log('Test:', result.tests?.title);
    console.log('Status:', result.status);
    console.log('Completed At:', result.completed_at);

    const scores = result.detailed_scores;

    if (!scores) {
        console.log('No detailed_scores found.');
        return;
    }

    console.log('\n--- 1. Response Reliability (응답신뢰도) ---');
    // Assuming reliability is stored in 'validity' or similar within detailed_scores
    // Check for 'responses_validity' or specific scales like 'Social Desirability'
    // Display whatever structure is there
    console.log(JSON.stringify(scores.validity || scores.reliability || "Not found in root", null, 2));

    // Also look for specific scales that might indicate reliability (e.g., consistency, desirability)
    // Often these are part of the 'scales' object

    console.log('\n--- 2. All Competencies ---');
    if (scores.competencies) {
        Object.entries(scores.competencies).forEach(([key, val]: [string, any]) => {
            console.log(`- ${key}: ${JSON.stringify(val)}`);
        });
    }

    console.log('\n--- 3. All Scales ---');
    if (scores.scales) {
        Object.entries(scores.scales).forEach(([key, val]: [string, any]) => {
            console.log(`- ${key}: ${JSON.stringify(val)}`);
        });
    }

    // Check for any specific reliability keys in scales
    console.log('\n--- 4. Potential Reliability Scales ---');
    if (scores.scales) {
        const potentialKeys = ['Social Desirability', 'Consistency', 'Response Reliability', 'infrequency', 'lie'];
        potentialKeys.forEach(pk => {
            const found = Object.entries(scores.scales).find(([k]) => k.toLowerCase().includes(pk.toLowerCase()));
            if (found) {
                console.log(`Found potential reliability scale: ${found[0]} -> ${JSON.stringify(found[1])}`);
            }
        });
    }

    // console.log(JSON.stringify(scores, null, 2)); // Uncomment for full dump if needed
}

inspectReport();
