const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Error: Env variables are missing.');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function updateQuestion() {
    const questionId = '371688b3-f938-4b8a-b40b-30a460596e0a';
    const newContent = '다른 사람들이 나를 해칠 수 있다고 생각한다.'; // 마침표 일관성 유지

    console.log(`Updating question content for ID: ${questionId}...`);
    
    const { data, error } = await supabase
        .from('questions')
        .update({ content: newContent })
        .eq('id', questionId)
        .select();

    if (error) {
        console.error('Error updating question:', error.message);
    } else {
        console.log('✅ Question updated successfully:');
        console.log(data);
    }
}

updateQuestion();
