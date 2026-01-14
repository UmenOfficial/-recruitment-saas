import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function checkWaitlist() {
    const { data, count, error } = await supabase
        .from('waitlist')
        .select('*, created_at_kst', { count: 'exact' }); // Explicitly select new column if needed, or * covers it if schema updated

    if (error) {
        console.error("Error:", error);
    } else {
        console.log(`Total count: ${count}`);
        console.log("Entries:", data);

        const target = data?.find((d: any) => d.email === 'prodaum@nate.com');
        if (target) {
            console.log("Target user found:", target);
            console.log("KST Time (from DB):", target.created_at_kst);
        } else {
            console.log("Target user NOT found.");
        }
    }
}

checkWaitlist();
