const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Error: Env variables are missing.');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function updateSensitivityQuestion() {
    const questionId = 'e307ce04-90fa-4791-b0c7-59f3257efc51';
    const newContent = '상대방이 무엇을 요구하는지 파악할 수 있다.'; // 마침표 일관성 적용

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

updateSensitivityQuestion();
