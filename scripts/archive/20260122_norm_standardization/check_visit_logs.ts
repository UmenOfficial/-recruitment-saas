
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function checkVisits() {
    console.log('--- Checking Visits (Jan 18 - Jan 22) ---\n');

    const startDate = '2026-01-18T00:00:00';
    const endDate = '2026-01-22T23:59:59';

    const { data: logs, error } = await supabase
        .from('audit_logs')
        .select('*')
        .eq('action', 'HOMEPAGE_VISIT')
        .gte('timestamp', startDate)
        .lte('timestamp', endDate);

    if (error) {
        console.error('Error:', error);
        return;
    }

    const total = logs?.length || 0;
    const loggedIn = logs?.filter(l => l.actor_id !== null).length || 0;
    const anonymous = logs?.filter(l => l.actor_id === null).length || 0;

    console.log(`Period: ${startDate} ~ ${endDate}`);
    console.log(`Total Visits: ${total}`);
    console.log(`Logged In: ${loggedIn}`);
    console.log(`Anonymous: ${anonymous}`);

    if (loggedIn === 0) {
        console.log('\nResult: 0 logged-in visits found. This confirms the previous tracking issue.');
    } else {
        console.log('\nResult: Found logged-in visits.');
    }
}

checkVisits();
