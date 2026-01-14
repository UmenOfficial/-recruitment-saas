
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function inspectAttempt7() {
    const { data: user } = await supabase.from('users').select('id').eq('email', 'test_candidate@umen.cloud').single();
    if (!user) return;

    const { data: results } = await supabase
        .from('test_results')
        .select('*')
        .eq('user_id', user.id)
        .order('attempt_number', { ascending: true });

    console.log(`Checking ${results?.length} attempts...`);

    // Find the one matching the screenshot first
    let matchedAttempt = null;

    results?.forEach(r => {
        const c = r.detailed_scores?.competencies;
        if (!c) return;

        const vals = Object.values(c).map((v: any) => Math.round(v.t_score));
        // Check for loose match of 10, 17, 14
        if (vals.includes(10) && (vals.includes(17) || vals.includes(14))) {
            console.log(`>>> MATCH FOUND: Attempt ${r.attempt_number} (Total ${r.total_score})`);
            matchedAttempt = r;
        }
    });

    // Check Attempt 2 specifically
    const attempt2 = results?.find(r => r.attempt_number === 2);
    if (attempt2) {
        const r = attempt2;
        console.log(`\n--- Detailed Inspection of Attempt ${r.attempt_number} ---`);

        // Check Answers Pattern
        const ansValues = Object.values(r.answers_log);
        const uniqueAns = new Set(ansValues);
        // Distribution
        const counts: any = {};
        ansValues.forEach((v: any) => counts[v] = (counts[v] || 0) + 1);
        console.log(`Answers Pattern: ${JSON.stringify(counts)}`);

        console.log(`Total Score: ${r.total_score}`);

        console.log("\nCompetencies:");
        Object.entries(r.detailed_scores.competencies).forEach(([k, v]: any) =>
            console.log(`- ${k}: T=${v.t_score} (Raw=${v.raw})`)
        );

        console.log("\nMind Care (Disorders):");
        const scales = r.detailed_scores.scales;
        Object.entries(scales).forEach(([k, v]: any) => {
            if (k.includes('장애') || k.includes('공격성') || k === '자기신뢰도검증') {
                console.log(`- ${k}: T=${v.t_score}`);
            }
        });

        console.log("\nBottom 4 Candidates:");
        const sortedScales = Object.entries(scales).map(([k, v]: any) => ({ name: k, t: v.t_score })).sort((a, b) => a.t - b.t);
        sortedScales.slice(0, 5).forEach(s => console.log(`- ${s.name}: ${s.t}`));
    }
}

inspectAttempt7();
