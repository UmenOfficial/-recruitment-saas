const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Error: Env variables are missing.');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function countAllQuestions() {
    console.log('Counting questions in DB...');
    
    // 1. Total Count
    const { count: totalCount, error: totalError } = await supabase
        .from('questions')
        .select('*', { count: 'exact', head: true });
        
    if (totalError) {
        console.error('Error:', totalError.message);
        return;
    }
    console.log(`Total questions in questions table: ${totalCount}`);

    // 2. Personality vs Aptitude
    const { count: pCount } = await supabase
        .from('questions')
        .select('*', { count: 'exact', head: true })
        .eq('type', 'PERSONALITY');
    console.log(`PERSONALITY questions: ${pCount}`);

    const { count: aCount } = await supabase
        .from('questions')
        .select('*', { count: 'exact', head: true })
        .eq('type', 'APTITUDE');
    console.log(`APTITUDE questions: ${aCount}`);

    // 3. Check specific IDs existence
    const testIds = [
        'fe07393d-6911-49ac-94a7-a5b4c4c0229a', // NIS
        'b90a3fa3-02ff-44cf-9e55-3f7c4d667aa1'  // Standard
    ];

    for (const id of testIds) {
        const { data, error } = await supabase
            .from('questions')
            .select('id, content, category, type')
            .eq('id', id)
            .maybeSingle();

        if (error) {
            console.error(`Error checking ${id}:`, error.message);
        } else {
            console.log(`Checked ID ${id}:`, data ? `Found ("${data.content}", Category: ${data.category})` : 'Not Found');
        }
    }
}

countAllQuestions();
