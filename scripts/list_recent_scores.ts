
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function checkRecentScores() {
    console.log('--- Checking Recent Test Scores in DB ---\n');

    const { data: results, error } = await supabase
        .from('test_results')
        .select(`
            id, 
            total_score, 
            t_score, 
            completed_at,
            user_id
        `)
        .order('completed_at', { ascending: false })
        .limit(20);

    if (error) console.error(error);

    results?.forEach((r: any) => {
        console.log(`[${r.completed_at}] User=${r.user_id}: Total=${r.total_score}, T=${r.t_score}, ID=${r.id}`);
    });
}

checkRecentScores();
