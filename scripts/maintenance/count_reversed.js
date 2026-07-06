const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Error: Env variables are missing.');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function countReversed() {
    console.log('Counting reversed questions in DB...');
    
    // 1. Total Reversed Count
    const { count, error } = await supabase
        .from('questions')
        .select('*', { count: 'exact', head: true })
        .eq('type', 'PERSONALITY')
        .eq('is_reverse_scored', true);

    if (error) {
        console.error('Error:', error.message);
        return;
    }

    console.log(`Total reversed scored personality questions: ${count}`);

    // 2. Group by Category
    const { data: questions, error: fetchError } = await supabase
        .from('questions')
        .select('category')
        .eq('type', 'PERSONALITY')
        .eq('is_reverse_scored', true);

    if (fetchError) {
        console.error(fetchError.message);
        return;
    }

    const counts = {};
    questions.forEach(q => {
        const cat = q.category || 'Unknown';
        counts[cat] = (counts[cat] || 0) + 1;
    });

    console.log('\nReversed Questions Count by Category:');
    console.table(Object.entries(counts).map(([cat, count]) => ({ Category: cat, Count: count })));
}

countReversed();
