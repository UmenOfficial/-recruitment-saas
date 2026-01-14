
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

const EXCLUDED_SCALES = [
    '지시불이행', '거짓말', '자기신뢰도검증', '공격성', '의존성 성격장애',
    '편접성 성격장애', '불안/우울 장애', '조현형성격장애', '반사회적 성격장애', '경계선 성격장애'
];

async function analyzeReliability() {
    console.log("Fetching Test & Questions...");
    const { data: tests } = await supabase.from('tests').select('id').ilike('title', '%NIS%Customizing%');
    const testId = tests?.[0]?.id;
    if (!testId) { console.error("Test not found"); return; }

    const { data: qData } = await supabase
        .from('test_questions')
        .select('questions(id, category, content)')
        .eq('test_id', testId);

    if (!qData) return;
    const questions = qData.map((d: any) => d.questions);

    console.log("Fetching Seeded Results...");
    const { data: results } = await supabase
        .from('test_results')
        .select('id, answers_log')
        .eq('test_id', testId)
        .gte('attempt_number', 1000);

    if (!results) return;
    console.log(`Analyzing ${results.length} results...`);

    const stats = {
        total: results.length,
        fail_variance: 0,
        fail_social: 0,
        fail_lie: 0,
        fail_compliance: 0,
        fail_validation: 0,
        fail_any: 0
    };

    results.forEach(res => {
        const answers = res.answers_log || {};
        const failures: string[] = [];

        // 1. Variance Check
        const validStdDevItems = questions.filter((q: any) => !EXCLUDED_SCALES.includes(q.category));
        const stdDevScores = validStdDevItems.map((q: any) => answers[q.id]).filter((s: any) => s !== undefined);
        if (stdDevScores.length > 1) {
            const mean = stdDevScores.reduce((a: any, b: any) => a + b, 0) / stdDevScores.length;
            const variance = stdDevScores.reduce((a: any, b: any) => a + Math.pow(b - mean, 2), 0) / (stdDevScores.length - 1);
            const stdDev = Math.sqrt(variance);
            if (stdDev <= 0.5) failures.push('VARIANCE');
        }

        // 2. Social Desirability
        const validSocialItems = questions.filter((q: any) => !EXCLUDED_SCALES.includes(q.category));
        if (validSocialItems.length > 0) {
            const highScores = validSocialItems.filter((q: any) => (answers[q.id] || 0) >= 5).length;
            const ratio = highScores / validSocialItems.length;
            if (ratio >= 0.5) failures.push('SOCIAL');
        }

        // 3. Lie Scale
        const lieItems = questions.filter((q: any) => q.category === '거짓말');
        if (lieItems.length > 0) {
            const lieCount = lieItems.filter((q: any) => (answers[q.id] || 0) >= 4).length;
            if (lieCount >= 3) failures.push('LIE');
        }

        // 4. Non-Compliance
        const ncItems = questions.filter((q: any) => q.category === '지시불이행');
        let mismatchCount = 0;
        ncItems.forEach((q: any) => {
            const ans = answers[q.id];
            if (ans === undefined) return;
            let target = -1;
            if (q.content.includes("'매우 그렇다'")) target = 5;
            else if (q.content.includes("'그렇다'")) target = 4;
            else if (q.content.includes("'보통'") || q.content.includes("'보통이다'")) target = 3;
            else if (q.content.includes("'전혀 그렇지 않다'")) target = 1;
            else if (q.content.includes("'그렇지 않다'")) target = 2;

            if (target !== -1 && ans !== target) mismatchCount++;
        });
        if (mismatchCount >= 2) failures.push('COMPLIANCE');

        // 5. Self-Validation
        const svItems = questions.filter((q: any) => q.category === '자기신뢰도검증');
        if (svItems.length > 0) {
            const svCount = svItems.filter((q: any) => (answers[q.id] || 0) >= 4).length;
            if (svCount >= 3) failures.push('VALIDATION');
        }

        if (failures.length > 0) {
            stats.fail_any++;
            if (failures.includes('VARIANCE')) stats.fail_variance++;
            if (failures.includes('SOCIAL')) stats.fail_social++;
            if (failures.includes('LIE')) stats.fail_lie++;
            if (failures.includes('COMPLIANCE')) stats.fail_compliance++;
            if (failures.includes('VALIDATION')) stats.fail_validation++;
        }
    });

    console.log("\n=== Reliability Analysis Results ===");
    console.log(`Total Samples: ${stats.total}`);
    console.log(`Failed Any Check: ${stats.fail_any} (${((stats.fail_any / stats.total) * 100).toFixed(1)}%)`);
    console.log(`- Variance / Pattern: ${stats.fail_variance}`);
    console.log(`- Social Desirability: ${stats.fail_social}`);
    console.log(`- Lie Scale (>=3 high): ${stats.fail_lie}`);
    console.log(`- Non-Compliance (>=2 mismatch): ${stats.fail_compliance}`);
    console.log(`- Self-Validation (>=3 high): ${stats.fail_validation}`);
}

analyzeReliability();
