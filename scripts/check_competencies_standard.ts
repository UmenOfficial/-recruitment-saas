
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function checkCompetencies() {
    const testId = 'a724bab1-b7e2-4b99-a5a3-8ae47cd9411e'; // Standard Personality Test
    console.log(`Checking competencies for test: ${testId}`);

    const { data, error } = await supabase
        .from('competencies')
        .select('*')
        .eq('test_id', testId);

    if (error) {
        console.error(error);
        return;
    }

    console.log('Found competencies:', data);

    // Also check Scale Norms of Source to know what we are copying
    const sourceId = '77ff6903-41f4-4b1f-97e2-8f42746b10e4';
    const { data: sourceNorms } = await supabase
        .from('test_norms')
        .select('*')
        .eq('test_id', sourceId)
        .ilike('category_name', 'Scale_%'); // Only Scales

    console.log(`Found ${sourceNorms?.length} Scale Norms in Source Test.`);
}

checkCompetencies();
