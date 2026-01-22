
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function checkJson() {
    console.log('--- Checking Detailed Scores JSON ---\n');

    const { data: results } = await supabase
        .from('test_results')
        .select('id, detailed_scores')
        .eq('id', 'b916a05c-9535-4a0d-a3b4-d5085f47f076')
        .limit(1);

    if (results && results[0]) {
        const ds = results[0].detailed_scores;
        console.log('Keys:', Object.keys(ds).slice(0, 10)); // Check prefixes

        console.log('\n--- Specific Competency Keys ---');
        console.log(Object.keys(ds).filter(k => k.includes('Comp_') || k.includes('애국심')));

        console.log('\n--- Specific Scale Keys ---');
        console.log(Object.keys(ds).filter(k => k.includes('Scale_') || k.includes('창의성')));

        console.log('\n--- Values ---');
        console.log('Comp_애국심/헌신:', ds['Comp_애국심/헌신']);
        console.log('애국심/헌신:', ds['애국심/헌신']); // Check if plain exists
    } else {
        console.log('Result not found');
    }
}

checkJson();
