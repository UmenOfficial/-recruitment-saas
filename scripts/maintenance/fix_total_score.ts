
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
    console.error('Missing environment variables');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

async function fixTotalScore() {
    const reportId = 'a9cee6a9-b11b-421a-bc97-ed99414a8778';
    const newScore = 93;

    // Verify first
    const { data: current } = await supabase.from('test_results').select('total_score').eq('id', reportId).single();
    if (!current) {
        console.error('Record not found');
        return;
    }
    console.log(`Current Score: ${current.total_score}`);

    if (current.total_score !== 226) {
        console.warn('Score is not 226, skipping auto-fix to avoid race conditions unless forced.');
        // If it's already fixed or different, maybe just log it.
        // But for this task I'll force update if it looks wrong (e.g. > 100)
        if (current.total_score <= 100) {
            console.log('Score seems already corrected.');
            return;
        }
    }

    // Update
    const { error } = await supabase
        .from('test_results')
        .update({ total_score: newScore })
        .eq('id', reportId);

    if (error) {
        console.error('Update failed:', error);
    } else {
        console.log(`Successfully updated score to ${newScore}`);
    }
}

fixTotalScore();
