const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Error: Env variables are missing.');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function updateSpontaneityQuestion() {
    const questionId = '83652590-dd0c-4f96-a5db-40a9392a02c9';
    const newContent = '상대방이 업무를 요청하거나 지시하면 그 때 일을 시작한다.'; // 마침표 일관성 적용

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

updateSpontaneityQuestion();
