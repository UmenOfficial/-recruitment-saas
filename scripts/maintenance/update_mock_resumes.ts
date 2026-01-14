
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
    const postingId = '4ef1b340-33db-405d-b3a9-938f5068dd02';
    const MOCK_RESUME_URL = 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf';

    console.log(`Updating applications for posting: ${postingId}`);

    const { data: apps } = await supabase
        .from('applications')
        .select('id')
        .eq('posting_id', postingId);

    if (!apps) {
        console.log('No apps found');
        return;
    }

    for (const app of apps) {
        const { error } = await supabase
            .from('applications')
            .update({ resume_url: MOCK_RESUME_URL })
            .eq('id', app.id);

        if (error) console.error(`Failed to update ${app.id}:`, error);
        else console.log(`Updated ${app.id} with mock resume`);
    }
}

main();
