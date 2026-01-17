
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

const MIND_CARE_KEYS = [
    '불안/우울 장애',
    '공격성',
    '조현형성격장애',
    '반사회적 성격장애',
    '경계선 성격장애',
    '의존성 성격장애',
    '편접성 성격장애'
];

async function checkMindCareScores() {
    console.log('--- Checking Mind Care Scores (Threshold >= 65) ---');

    // Fetch recent test results
    const { data: results, error } = await supabase
        .from('test_results')
        .select(`
            id, user_id, total_score, detailed_scores, completed_at,
            user:users!inner(email, full_name)
        `)
        .not('completed_at', 'is', null)
        .order('completed_at', { ascending: false })
        .limit(10);

    if (error) {
        console.error(error);
        return;
    }

    if (!results || results.length === 0) {
        console.log('No results found.');
        return;
    }

    for (const res of results) {
        const user = res.user as any;
        console.log(`\nUser: ${user.full_name || 'No Name'} (${user.email})`);
        console.log(`Total Score: ${res.total_score}`);

        const scales = (res.detailed_scores as any)?.scales || {};
        const warnings: string[] = [];
        const normal: string[] = [];

        MIND_CARE_KEYS.forEach(key => {
            const data = scales[key];
            if (!data) {
                console.log(`  [MISSING] ${key}`);
                return;
            }

            // Handle different structure possibilities
            const tScore = typeof data === 'number' ? data : data.t_score;

            if (tScore >= 65) {
                warnings.push(`${key}: ${tScore.toFixed(1)}`);
            } else {
                normal.push(`${key}: ${tScore.toFixed(1)}`);
            }
        });

        if (warnings.length > 0) {
            console.log('  ⚠️ WARNINGS (>= 65):');
            warnings.forEach(w => console.log(`     - ${w}`));
        } else {
            console.log('  ✅ Clean (No Warnings)');
        }

        if (normal.length > 0) {
            console.log('     Normal Range:', normal.join(', '));
        }
    }
}

checkMindCareScores();
