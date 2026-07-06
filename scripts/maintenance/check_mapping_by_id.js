const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Error: Env variables are missing.');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkMappingById() {
    const questionId = '371688b3-f938-4b8a-b40b-30a460596e0a';
    console.log(`Checking which tests map to question ID: ${questionId}`);

    const { data: mappings, error } = await supabase
        .from('test_questions')
        .select(`
            test_id,
            tests(title),
            order_index
        `)
        .eq('question_id', questionId);

    if (error) {
        console.error('Error:', error.message);
    } else {
        console.log('Mappings found:', mappings.map(m => ({
            test_id: m.test_id,
            test_title: m.tests ? m.tests.title : 'Unknown',
            order_index: m.order_index
        })));
    }
}

checkMappingById();
