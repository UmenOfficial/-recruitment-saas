
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function verifyJoin() {
    console.log("Verifying Join Query...");

    try {
        const { data, error } = await supabase
            .from('test_results')
            .select(`
                id,
                test_id,
                tests ( title, type )
            `)
            .limit(1);

        if (error) {
            console.error("❌ Join Query Failed:", error);
        } else {
            console.log("✅ Join Query Success!");
            console.log("Sample Data:", JSON.stringify(data, null, 2));
        }
    } catch (e) {
        console.error("❌ Exception:", e);
    }
}

verifyJoin();
