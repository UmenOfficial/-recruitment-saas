
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkAnswers() {
    const targetId = 'df2e9645-0bc1-40dd-834c-2ed32d38d01d';

    // Select questions_order as well
    const { data: result, error } = await supabase
        .from('test_results')
        .select(`
            id,
            answers_log,
            questions_order
        `)
        .eq('id', targetId)
        .single();

    if (error) {
        console.error('Error:', error);
        return;
    }

    // Fetch the reverse question ID to look up in log
    // Content: "변화가 필요한 상황에서도 기존 방식을 고수한다."
    const { data: qData } = await supabase
        .from('questions')
        .select('id, content')
        .eq('content', '변화가 필요한 상황에서도 기존 방식을 고수한다.');

    if (!qData || qData.length === 0) {
        console.log('Question not found');
        return;
    }
    const qId = qData[0].id;
    console.log(`Reverse QID: ${qId}`);

    const qOrder = result.questions_order as string[];
    const idx = qOrder.indexOf(qId);
    console.log(`Reverse Question Index in Order: ${idx}`);

    if (idx !== -1) {
        const answer = result.answers_log[idx.toString()] || result.answers_log[idx];
        console.log(`User Answer for Reverse Question (Raw): ${answer}`);
    } else {
        console.log('Reverse Question not in questions_order!');
    }

    // Also check other Openness questions
    const { data: openQs } = await supabase
        .from('questions')
        .select('id, content')
        .eq('category', '개방성');

    console.log('\nAll Openness Answers:');
    let rawSum = 0;

    if (openQs) {
        openQs.forEach(q => {
            const qIdx = qOrder.indexOf(q.id);
            if (qIdx !== -1) {
                const ans = result.answers_log[qIdx.toString()] || result.answers_log[qIdx];
                console.log(`- ${q.content} [Idx ${qIdx}]: ${ans}`);
                if (ans) rawSum += ans;
            } else {
                console.log(`- ${q.content}: Not in Order!`);
            }
        });
    }
    console.log(`Simple Sum (No Logic): ${rawSum}`);
}

checkAnswers();
