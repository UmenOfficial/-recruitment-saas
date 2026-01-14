
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function cleanup() {
    console.log("Cleaning up wrong 'NIS_260111' test...");

    // Find the WRONG test created previously
    const { data: tests } = await supabase.from('tests').select('id, title').eq('title', 'NIS_260111');

    if (!tests || tests.length === 0) {
        console.log("No wrong test found. Good.");
        return;
    }

    const targetId = tests[0].id;
    console.log(`Deleting Test ID: ${targetId}`);

    // Cascade delete handles related rows usually, but let's be safe
    // Delete norms, questions, competencies first if cascade not set
    await supabase.from('test_norms').delete().eq('test_id', targetId);
    await supabase.from('competency_scales').delete().in('competency_id', (
        await supabase.from('competencies').select('id').eq('test_id', targetId)
    ).data?.map((c: any) => c.id) || []);
    await supabase.from('competencies').delete().eq('test_id', targetId);
    await supabase.from('test_questions').delete().eq('test_id', targetId);

    // Delete Test
    const { error } = await supabase.from('tests').delete().eq('id', targetId);

    if (error) console.error("Error deleting test:", error);
    else console.log("Deleted successfully.");
}

cleanup();
