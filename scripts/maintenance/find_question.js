const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Error: Env variables are missing.');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function findQuestion() {
    const targetText = '다른 사람들이 나를 해칠 수 있다고 보아 경계한다';
    console.log(`1. Exact match search for: "${targetText}"`);
    
    const { data: exactMatch, error: exactError } = await supabase
        .from('questions')
        .select('id, content, type, category')
        .eq('content', targetText);

    if (exactError) {
        console.error('Exact match query error:', exactError.message);
    } else if (exactMatch && exactMatch.length > 0) {
        console.log('✅ Exact match found:');
        console.log(exactMatch);
        return;
    } else {
        console.log('❌ No exact match found.');
    }

    console.log(`\n2. Partial search using keywords: "해칠", "경계"`);
    const { data: partialMatch, error: partialError } = await supabase
        .from('questions')
        .select('id, content, type, category')
        .or('content.ilike.%해칠%,content.ilike.%경계%');

    if (partialError) {
        console.error('Partial query error:', partialError.message);
    } else if (partialMatch && partialMatch.length > 0) {
        console.log('💡 Similar questions found:');
        console.log(partialMatch);
    } else {
        console.log('❌ No similar questions found.');
    }
}

findQuestion();
