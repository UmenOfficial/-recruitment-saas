
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function updateSpecialNorms() {
    console.log("Searching for test 'NIS 25.12.28.'...");

    // 1. Find Test
    const { data: tests } = await supabase.from('tests').select('id, title').ilike('title', '%NIS%');
    const targetTest = tests?.find(t => t.title.includes('25.12.28') || t.title.includes('2025.12.28')) || tests?.[0];

    if (!targetTest) {
        console.error("Test not found.");
        return;
    }
    console.log(`Target Test: ${targetTest.title} (${targetTest.id})`);

    // 2. Fetch All Norms
    const { data: norms } = await supabase.from('test_norms').select('*').eq('test_id', targetTest.id);
    if (!norms) return;

    // 3. Define Targets and Reductions
    const targets = [
        { key: '거짓말', reduceBy: 1.5 },
        { key: '지시불이행', reduceBy: 1.0 },
        { key: '자기신뢰도', reduceBy: 1.5 } // Will match '자기신뢰도검증'
    ];

    const updates: any[] = [];

    norms.forEach(n => {
        const name = n.category_name;

        // Find matching target
        const target = targets.find(t => name.includes(t.key));
        if (!target) return;

        const oldSd = n.std_dev_value;
        const newSd = Math.max(0.1, oldSd - target.reduceBy);

        updates.push({
            test_id: targetTest.id,
            category_name: name,
            std_dev_value: parseFloat(newSd.toFixed(5)),
            _old: oldSd,
            _reduce: target.reduceBy
        });
    });

    console.log(`\nIdentified ${updates.length} special norms to update:`);
    updates.forEach(u => {
        console.log(` - [${u.category_name}] SD: ${u._old} - ${u._reduce} = ${u.std_dev_value}`);
    });

    // 4. Apply
    console.log("\nApplying special updates...");
    for (const u of updates) {
        const { _old, _reduce, ...payload } = u;
        const { error } = await supabase
            .from('test_norms')
            .update({ std_dev_value: payload.std_dev_value })
            .eq('test_id', payload.test_id)
            .eq('category_name', payload.category_name);

        if (error) console.error(`Failed to update ${payload.category_name}:`, error.message);
    }
    console.log("Special update complete.");
}

updateSpecialNorms();
