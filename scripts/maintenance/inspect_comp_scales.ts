
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkCompetencyScales() {
    const { data, error } = await supabase
        .from('competency_scales')
        .select('*')
        .ilike('scale_name', '%Open-Heart%'); // Or just query all and filter

    if (error) {
        console.error('Error:', error);
        return;
    }

    console.log(`Found ${data.length} matches.`);
    data.forEach(d => console.log(d));

    // Also check for '개방성' to see if it has metadata
    const { data: kData } = await supabase
        .from('competency_scales')
        .select('*')
        .eq('scale_name', '개방성');

    console.log(`\nMatches for '개방성': ${kData?.length}`);
    kData?.forEach(d => console.log(d));
}

checkCompetencyScales();
