
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function checkStrictEquality() {
    console.log('--- Strict Equality Check ---\n');

    const { data: tests } = await supabase.from('tests').select('id').ilike('title', '%NIS%').limit(1);
    const testId = tests![0].id;

    // 1. Get Norm Names
    const { data: norms } = await supabase
        .from('test_norms')
        .select('category_name')
        .eq('test_id', testId);

    const normNames = norms!.map(n => n.category_name);
    console.log(`Norms (${normNames.length}):`);
    normNames.slice(0, 5).forEach(n => {
        console.log(`  "${n}" (Len: ${n.length}, Codes: ${n.split('').map(c => c.charCodeAt(0)).join(',')})`);
    });

    // 2. Get Scale Names
    const { data: comps } = await supabase
        .from('competencies')
        .select('competency_scales(scale_name)')
        .eq('test_id', testId);

    const scaleNames: string[] = [];
    comps!.forEach((c: any) => {
        c.competency_scales.forEach((s: any) => scaleNames.push(s.scale_name));
    });

    console.log(`\nScales (${scaleNames.length}):`);
    scaleNames.slice(0, 5).forEach(n => {
        console.log(`  "${n}" (Len: ${n.length}, Codes: ${n.split('').map(c => c.charCodeAt(0)).join(',')})`);
    });

    // 3. Check Overlap
    const validSet = new Set(scaleNames);
    console.log('\nMatching Check:');
    normNames.forEach(n => {
        if (!n.startsWith('Comp_')) {
            const match = validSet.has(n);
            console.log(`  Norm "${n}" in valid scales? ${match}`);
        }
    });
}

checkStrictEquality();
