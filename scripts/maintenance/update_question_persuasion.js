const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Error: Env variables are missing.');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function updatePersuasionQuestion() {
    const questionId = '862b6943-75a4-4e92-a516-4bee8757e90c';
    const newContent = '상대방을 설득할 자신이 없어 내 의견을 접는다.'; // 마침표 일관성 적용

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

updatePersuasionQuestion();
