const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Error: Env variables are missing.');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function countCategories() {
    console.log('Counting questions by category...');
    const { data: questions, error } = await supabase
        .from('questions')
        .select('category')
        .eq('type', 'PERSONALITY');

    if (error) {
        console.error(error.message);
        return;
    }

    const counts = {};
    questions.forEach(q => {
        const cat = q.category || 'Unknown';
        counts[cat] = (counts[cat] || 0) + 1;
    });

    console.log('Category Counts:');
    console.table(Object.entries(counts).map(([cat, count]) => ({ Category: cat, Count: count })));
}

countCategories();
