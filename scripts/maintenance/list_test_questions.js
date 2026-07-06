const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Error: Env variables are missing.');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function listTestQuestions() {
    console.log('Fetching all tests...');
    const { data: tests, error: testError } = await supabase
        .from('tests')
        .select('id, title, type');

    if (testError) {
        console.error('Error fetching tests:', testError.message);
        return;
    }

    for (const test of tests) {
        console.log(`\n--------------------------------------------------`);
        console.log(`Test: ${test.title} (ID: ${test.id})`);
        console.log(`--------------------------------------------------`);

        const { data: relations, error: rError } = await supabase
            .from('test_questions')
            .select('order_index, questions(id, content, category)')
            .eq('test_id', test.id)
            .order('order_index', { ascending: true });

        if (rError) {
            console.error('Error fetching questions mapping:', rError.message);
            continue;
        }

        console.log(`Total questions mapped: ${relations.length}`);
        
        if (relations.length > 0) {
            console.log('First 5 questions in this test:');
            relations.slice(0, 5).forEach(r => {
                const q = r.questions;
                if (q) {
                    console.log(`  [Order ${r.order_index}] [ID: ${q.id}] (${q.category}) -> "${q.content}"`);
                } else {
                    console.log(`  [Order ${r.order_index}] Question data is NULL (Orphaned Mapping)`);
                }
            });
        }
    }
}

listTestQuestions();
