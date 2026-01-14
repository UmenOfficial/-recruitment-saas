
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function inspectCompliance() {
    console.log("Searching for test 'NIS Customizing Test'...");
    const { data: tests } = await supabase.from('tests').select('id').ilike('title', '%NIS%Customizing%');
    const testId = tests?.[0]?.id;

    const { data: qData } = await supabase
        .from('test_questions')
        .select('questions(id, category, content)')
        .eq('test_id', testId);

    if (!qData) return;
    const questions = qData.map((d: any) => d.questions);

    const ncItems = questions.filter((q: any) => q.category === '지시불이행');
    console.log(`Found ${ncItems.length} Non-Compliance Items:`);

    ncItems.forEach((q: any) => {
        let target = -1;
        if (q.content.includes("'매우 그렇다'에 응답")) target = 5;
        else if (q.content.includes("'그렇다'에 응답")) target = 4;
        else if (q.content.includes("'보통이다'에 응답")) target = 3;
        else if (q.content.includes("'보통'에 응답")) target = 3;
        else if (q.content.includes("'전혀 그렇지 않다'에 응답")) target = 1;
        else if (q.content.includes("'그렇지 않다'에 응답")) target = 2;

        console.log(`[${q.id}] Target: ${target} | Content: ${q.content}`);
    });
}

inspectCompliance();
