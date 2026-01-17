
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function verifyZoellanne() {
    console.log('--- Verifying Score for zoellanne44@gmail.com ---');

    // Use ilike for partial match to be safe
    const { data: users, error } = await supabase
        .from('users')
        .select('id, email, created_at')
        .ilike('email', '%zoellanne%')
        .limit(5);

    if (error) {
        console.error('Error searching user:', error);
        return;
    }

    if (!users || users.length === 0) {
        console.log(`User matching 'zoellanne' not found.`);
        return;
    }

    const user = users[0];

    const { data: results } = await supabase
        .from('test_results')
        .select('total_score, t_score, detailed_scores, completed_at')
        .eq('user_id', user.id)
        .order('completed_at', { ascending: false });

    if (!results || results.length === 0) {
        console.log('No results found.');
        return;
    }

    const latest = results[0];
    console.log(`User: ${user.email}`);
    console.log(`Latest Total Score (DB): ${latest.total_score}`);
    console.log(`Latest T-Score (DB): ${latest.t_score}`); // Log t_score explicitly
    console.log(`Completed At: ${latest.completed_at}`);

    // Check Competencies
    if (latest.detailed_scores && (latest.detailed_scores as any).competencies) {
        Object.entries((latest.detailed_scores as any).competencies).forEach(([k, v]: [string, any]) => {
            const val = typeof v === 'number' ? v : (v.t_score || v.raw || v.score);
            console.log(`- ${k}: ${val}`);
        });
    }
}

verifyZoellanne();
