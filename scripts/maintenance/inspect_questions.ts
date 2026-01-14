
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function inspectQuestions() {
    // Check columns
    const { data: cols, error: colError } = await supabase
        .from('questions')
        .select('*')
        .limit(1);

    if (cols && cols.length > 0) {
        console.log('Columns:', Object.keys(cols[0]));
    }

    // Check distinct scales/categories
    // Since we suspect '개방성', let's search for it in likely columns
    const { data: questions, error } = await supabase
        .from('questions')
        .select('id, content, category')
        .eq('category', '개방성');

    if (error) {
        console.error('Error:', error);
    } else {
        console.log(`Found ${questions.length} questions for '개방성':`);
        questions.forEach(q => console.log(`- ${q.content}`));
    }
}

inspectQuestions();
