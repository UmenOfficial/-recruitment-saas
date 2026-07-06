const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Error: Env variables are missing.');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function updateConsistencyDecisionQuestion() {
    const questionId = '4d338208-7210-433c-8a17-ee5f2567019b';
    const newContent = '상황이 바뀌어도 나의 의사결정 사항은 변하지 않는다.'; // 마침표 일관성 적용

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

updateConsistencyDecisionQuestion();
