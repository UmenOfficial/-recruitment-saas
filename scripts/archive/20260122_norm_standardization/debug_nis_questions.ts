
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function inspectNISQuestions() {
    console.log('--- NIS Customizing Test Question Categories ---\n');

    const { data: tests } = await supabase.from('tests').select('id, title').ilike('title', '%NIS%').limit(1);
    if (!tests || tests.length === 0) return;

    const testId = tests[0].id;

    const { data: qLinks } = await supabase
        .from('test_questions')
        .select('questions(category)')
        .eq('test_id', testId)
        .limit(20);

    const categories = new Set();
    qLinks?.forEach((Link: any) => {
        if (Link.questions?.category) categories.add(Link.questions.category);
    });

    console.log('Unique Categories found in Questions:');
    categories.forEach(c => console.log(` - ${c}`));
}

inspectNISQuestions();
