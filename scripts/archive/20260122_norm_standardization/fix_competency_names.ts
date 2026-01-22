
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function fixCompetencyNames() {
    console.log('--- Fixing Competency Names (Adding Comp_ Prefix) ---\n');

    const TARGET_TEST_TYPES = ['NIS', 'Standard'];

    // 1. Get Target Tests
    const { data: tests } = await supabase.from('tests').select('id, title');
    const targetTests = tests?.filter(t => TARGET_TEST_TYPES.some(k => t.title.includes(k))) || [];

    for (const test of targetTests) {
        console.log(`Processing Test: ${test.title}`);

        const { data: competencies } = await supabase
            .from('competencies')
            .select('*')
            .eq('test_id', test.id);

        if (!competencies) continue;

        for (const comp of competencies) {
            // Check if already prefixed
            if (comp.name.startsWith('Comp_')) {
                console.log(`  Skipping ${comp.name} (already prefixed)`);
                continue;
            }

            const newName = `Comp_${comp.name}`;
            console.log(`  Updating ${comp.name} -> ${newName}`);

            const { error } = await supabase
                .from('competencies')
                .update({ name: newName })
                .eq('id', comp.id);

            if (error) console.error(`    Error: ${error.message}`);
        }
    }
}

fixCompetencyNames();
