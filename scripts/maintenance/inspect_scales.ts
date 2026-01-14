
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkScales() {
    // Check columns first
    const { data: cols, error: colError } = await supabase
        .from('personality_scales')
        .select('*')
        .limit(1);

    if (cols && cols.length > 0) {
        console.log('Columns:', Object.keys(cols[0]));
    }

    // Search for "개방성" or matching description
    const { data: scales, error } = await supabase
        .from('personality_scales')
        .select('*')
        .or('name.eq.개방성,description.ilike.%Open-Heart%,name.ilike.%Open-Heart%');

    if (error) {
        console.error('Error:', error);
        return;
    }

    console.log('Found Scales:', scales);
}

checkScales();
