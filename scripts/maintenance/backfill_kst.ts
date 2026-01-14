
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function backfillKst() {
    const { data: users, error } = await supabase
        .from('waitlist')
        .select('*');

    if (error) {
        console.error("Error fetching users:", error);
        return;
    }

    console.log(`Found ${users.length} users. Updating KST...`);

    for (const user of users) {
        if (!user.created_at) continue;

        const date = new Date(user.created_at);
        const created_at_kst = date.toLocaleString('ko-KR', {
            timeZone: 'Asia/Seoul',
            year: 'numeric',
            month: 'numeric',
            day: 'numeric',
            hour: 'numeric',
            minute: 'numeric',
            second: 'numeric',
            hour12: true
        });

        const { error: updateError } = await supabase
            .from('waitlist')
            .update({ created_at_kst })
            .eq('id', user.id);

        if (updateError) {
            console.error(`Failed to update user ${user.email}:`, updateError);
        } else {
            console.log(`Updated ${user.email}: ${created_at_kst}`);
        }
    }
}

backfillKst();
