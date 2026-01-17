
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
const TARGET_EMAIL = 'zoellanne44@gmail.com';

async function checkRawLog() {
    const { data: users } = await supabase.from('users').select('id').eq('email', TARGET_EMAIL).single();
    if (!users) return console.log('User not found');

    const { data: results } = await supabase.from('test_results').select('answers_log').eq('user_id', users.id).limit(1);
    if (!results || !results[0]) return console.log('No result');

    const log = results[0].answers_log;

    let minVal = 999;
    let maxVal = -999;
    let valCount = 0;

    if (typeof log === 'object' && log !== null) {
        Object.values(log).forEach((v: any) => {
            const num = Number(v);
            if (!isNaN(num)) {
                if (num < minVal) minVal = num;
                if (num > maxVal) maxVal = num;
                valCount++;
            }
        });
    }

    console.log(`Scan Complete (${valCount} items)`);
    console.log(`Min Value: ${minVal}`);
    console.log(`Max Value: ${maxVal}`);

    if (minVal >= 1 && maxVal <= 5) console.log('Conclusion: Likely 1-based (1-5)');
    else if (minVal >= 0 && maxVal <= 4) console.log('Conclusion: Likely 0-based (0-4)');
    else console.log('Conclusion: Mixed or Unknown Range');
}

checkRawLog();
