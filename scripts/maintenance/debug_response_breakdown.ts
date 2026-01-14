
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function inspectResponses() {
    const email = 'test_user@umen.cloud';
    const targets = ['회복성', '경계선 성격장애'];

    console.log(`Inspecting responses for: ${targets.join(', ')} - User: ${email}`);

    // 1. Get User
    const { data: user } = await supabase.from('users').select('id').eq('email', email).single();
    if (!user) return console.log('User not found');

    // 2. Get Result
    const { data: results } = await supabase
        .from('test_results')
        .select('*')
        .eq('user_id', user.id)
        .order('completed_at', { ascending: false })
        .limit(1);

    if (!results || results.length === 0) return console.log('No results found');
    const r = results[0];

    // 3. Get Questions
    const { data: relations } = await supabase
        .from('test_questions')
        .select('question_id, questions(*)')
        .eq('test_id', r.test_id);

    const allQuestions = relations?.map((rel: any) => rel.questions) || [];

    // 4. Filter Target Questions
    const targetQuestions = allQuestions.filter((q: any) => targets.includes(q.category));

    console.log(`\nFound ${targetQuestions.length} relevant questions.`);

    // 5. Build Map: Index -> QuestionID -> Answer
    const answersMap = r.answers_log;
    const qOrder = r.questions_order;

    if (!qOrder) return console.log('Questions Order not found in result.');

    // 6. Display Details
    targets.forEach(category => {
        console.log(`\n=== Category: ${category} ===`);
        const questions = targetQuestions.filter((q: any) => q.category === category);

        let calculatedRawSum = 0;

        questions.forEach((q: any) => {
            // Find index in order
            const idx = qOrder.indexOf(q.id);
            if (idx === -1) {
                console.log(`[?] Question ${q.content} (ID: ${q.id}) not found in order.`);
                return;
            }

            const rawAnswer = answersMap[idx.toString()]; // Key is string index
            let finalScore = rawAnswer;

            if (q.is_reverse_scored) {
                finalScore = 6 - rawAnswer;
            }

            if (typeof rawAnswer === 'undefined') {
                console.log(`[MISSING] ${q.content}`);
            } else {
                console.log(`Q: ${q.content}`);
                console.log(`   - Answer: ${rawAnswer} ${q.is_reverse_scored ? '(Reverse Scored)' : ''}`);
                console.log(`   - Score Contribution: ${finalScore}`);
                calculatedRawSum += finalScore;
            }
        });
        console.log(`>> Total Calculated Raw Score for ${category}: ${calculatedRawSum}`);
    });
}

inspectResponses();
