
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

// --- SCORING LOGIC INLINED ---
function calculateTScore(raw: number, mean: number, stdDev: number): number {
    if (!stdDev || stdDev === 0) return 50;
    const t = 50 + 10 * ((raw - mean) / stdDev);
    return Math.max(20, Math.min(80, t)); // Clamp 20-80
}

function calculatePersonalityScores(
    answers: Record<string, number>,
    questions: any[],
    scaleNorms: any[],
    competencyNorms: any[],
    competencies: any[]
): any {
    const scaleRawScores: Record<string, number> = {};
    Object.entries(answers).forEach(([qId, val]) => {
        const question = questions.find(q => q.id === qId);
        if (!question || !question.category) return;
        scaleRawScores[question.category] = (scaleRawScores[question.category] || 0) + val;
    });

    const scaleFinal: Record<string, any> = {};
    const scaleTMapped: Record<string, number> = {};

    Object.keys(scaleRawScores).forEach(cat => {
        const raw = scaleRawScores[cat];
        const norm = scaleNorms.find(n => n.category_name === cat);
        const mean = norm?.mean_value || 0;
        const std = norm?.std_dev_value || 1;
        const t = calculateTScore(raw, mean, std);
        scaleFinal[cat] = { raw, t_score: t };
        scaleTMapped[cat] = t;
    });

    const competencyFinal: Record<string, any> = {};
    let totalRaw = 0;

    competencies.forEach((comp: any) => {
        const scaleNames = comp.competency_scales.map((s: any) => s.scale_name);
        let cRaw = 0;
        scaleNames.forEach((name: string) => {
            cRaw += (scaleTMapped[name] || 0);
        });

        const norm = competencyNorms.find(n => n.category_name === comp.name);
        const mean = norm?.mean_value || 0;
        const std = norm?.std_dev_value || 1;
        const cT = calculateTScore(cRaw, mean, std);
        competencyFinal[comp.name] = { raw: cRaw, t_score: cT };
        totalRaw += cT;
    });

    const totalNorm = competencyNorms.find(n => n.category_name === 'TOTAL')
        || scaleNorms.find(n => n.category_name === 'TOTAL');
    const totalT = calculateTScore(totalRaw, totalNorm?.mean_value || 0, totalNorm?.std_dev_value || 1);

    return {
        scales: scaleFinal,
        competencies: competencyFinal,
        total: { raw: totalRaw, t_score: totalT }
    };
}

async function seedDiverse() {
    console.log("Searching for test 'NIS Customizing Test'...");
    const { data: tests } = await supabase.from('tests').select('id').ilike('title', '%NIS%Customizing%');
    const testId = tests?.[0]?.id;
    if (!testId) { console.error("Test not found"); return; }

    const userId = '343867c2-1f4f-4a82-b376-507def31a864';

    // 1. Fetch Metadata
    const { data: qRelations } = await supabase.from('test_questions').select('questions(*)').eq('test_id', testId);
    // Flat map questions
    const questions = qRelations?.map((r: any) => r.questions) || [];
    console.log(`Loaded ${questions.length} questions.`);

    const { data: normsRaw } = await supabase.from('test_norms').select('*').eq('test_id', testId);

    // Process Norms (Handle prefixes)
    const scaleNorms: any[] = [];
    const compNorms: any[] = [];
    normsRaw?.forEach(n => {
        if (n.category_name.startsWith('Scale_')) {
            scaleNorms.push({ ...n, category_name: n.category_name.replace('Scale_', '') });
        } else if (n.category_name.startsWith('Comp_')) {
            compNorms.push({ ...n, category_name: n.category_name.replace('Comp_', '') });
        } else if (n.category_name === 'TOTAL') {
            compNorms.push(n);
        }
    });

    const { data: compDefsWithScales } = await supabase
        .from('competencies')
        .select('name, competency_scales(scale_name)')
        .eq('test_id', testId);

    // 2. Clear User Results
    await supabase.from('test_results').delete().eq('user_id', userId).eq('test_id', testId);
    console.log("Cleared old results.");

    // 3. Define Scenarios
    const scenarios = [
        // Anchors
        { label: "시작 - 모두 1점 (보수적)", method: "flat", val: 1, time: 600 },
        { label: "모두 2점", method: "flat", val: 2, time: 600 },
        { label: "모두 3점 (중립)", method: "flat", val: 3, time: 600 },
        { label: "모두 4점", method: "flat", val: 4, time: 600 },
        { label: "모두 5점 (긍정적)", method: "flat", val: 5, time: 600 },

        // Patterns
        { label: "지그재그 (1,5,1,5...)", method: "pattern", pat: [1, 5], time: 600 },
        { label: "계단식 (1,2,3,4,5...)", method: "pattern", pat: [1, 2, 3, 4, 5], time: 600 },
        { label: "3,4 반복 (평균 상회)", method: "pattern", pat: [3, 4], time: 600 },

        // Randoms
        { label: "무작위 (평균 3)", method: "random_normal", mean: 3, sd: 1, time: 600 },
        { label: "무작위 (평균 4)", method: "random_normal", mean: 4, sd: 0.5, time: 600 },
        { label: "무작위 (평균 2)", method: "random_normal", mean: 2, sd: 0.5, time: 600 },

        // Clinical Focus (Mind Care)
        // Need to know Mind Care Category Names: 
        // '불안/우울장애', '공격성', '반사회적 성격장애', '조현형 성격장애', etc. (from inspection)
        { label: "불안/우울 높음", method: "category_focus", target: ["불안/우울장애"], val: 5, base: 2, time: 600 },
        { label: "공격성 높음", method: "category_focus", target: ["공격성", "반사회적 성격장애"], val: 5, base: 3, time: 600 },
        { label: "임상척도 전체 위험", method: "clinical_high", val: 5, base: 2, time: 600 },
        { label: "임상척도 전체 양호", method: "clinical_high", val: 1, base: 4, time: 600 },

        // Reliability / Speed
        { label: "초고속 응답 (신뢰도 의심)", method: "random_normal", mean: 3, sd: 1, time: 45 }, // < 1 min
        { label: "빠른 응답", method: "random_normal", mean: 3, sd: 1, time: 180 }, // 3 mins
        { label: "장시간 응답", method: "random_normal", mean: 3, sd: 1, time: 3600 }, // 1 hour
        { label: "연속응답 (불성실 의심)", method: "long_string", val: 3, len: 50, time: 600 },

        // Personas
        { label: "리더형 (주도/책임 높음)", method: "category_focus", target: ["주도성", "책임성", "실행성", "도전성"], val: 5, base: 3, time: 600 },
        { label: "분석가형 (분석/객관 높음)", method: "category_focus", target: ["분석성", "객관성", "세밀성", "계획성"], val: 5, base: 3, time: 600 },
        { label: "지원가형 (공감/협동 높음)", method: "category_focus", target: ["공감성", "협동성", "수용성", "겸손성"], val: 5, base: 3, time: 600 },
        { label: "번아웃 (무기력)", method: "category_focus", target: ["실행성", "도전성", "몰입성"], val: 1, base: 2, time: 600 },
        { label: "완벽주의자 (세밀/규칙)", method: "category_focus", target: ["세밀성", "준수성", "계획성", "윤리성"], val: 5, base: 3, time: 600 },

        // More Varied
        { label: "무작위 혼합 A", method: "random_uniform", min: 1, max: 5, time: 600 },
        { label: "무작위 혼합 B", method: "random_uniform", min: 2, max: 4, time: 600 },
        { label: "특이 패턴 (1,1,5,5)", method: "pattern", pat: [1, 1, 5, 5], time: 600 },
        { label: "중간 마무리 (3점)", method: "flat", val: 3, time: 600 },
        { label: "마지막 - 종합 (랜덤)", method: "random_normal", mean: 3.5, sd: 1.2, time: 600 },
    ];

    // Ensure 30 items (pad if needed)
    while (scenarios.length < 30) {
        scenarios.push({ label: `추가 무작위 ${scenarios.length + 1}`, method: "random_uniform", min: 1, max: 5, time: 600 });
    }

    const clinicalCats = ["불안/우울장애", "공격성", "반사회적 성격장애", "조현형 성격장애", "경계선 성격장애", "편집성 성격장애", "의존성 성격장애", "알코올 의존", "자살 위험성"];

    for (let i = 0; i < scenarios.length; i++) {
        const sc = scenarios[i];
        const answersLog: Record<string, number> = {};
        const answersForScoring: Record<string, number> = {};

        questions.forEach((q, idx) => {
            let rawVal = 3;

            // Generate Raw Value based on Method
            if (sc.method === "flat") rawVal = sc.val!;
            else if (sc.method === "pattern") rawVal = sc.pat![idx % sc.pat!.length];
            else if (sc.method === "random_normal") {
                // Approximate normal
                const u = Math.random() + Math.random() + Math.random();
                const z = (u - 1.5) * 2; // approx -3 to 3
                rawVal = Math.round(sc.mean! + z * sc.sd!);
                rawVal = Math.max(1, Math.min(5, rawVal));
            }
            else if (sc.method === "random_uniform") {
                rawVal = Math.floor(Math.random() * (sc.max! - sc.min! + 1)) + sc.min!;
            }
            else if (sc.method === "long_string") {
                // First 50 same, rest random
                if (idx < sc.len!) rawVal = sc.val!;
                else rawVal = Math.floor(Math.random() * 5) + 1;
            }
            else if (sc.method === "category_focus") {
                if (sc.target!.includes(q.category)) rawVal = sc.val!;
                else rawVal = sc.base!;
            }
            else if (sc.method === "clinical_high") {
                if (clinicalCats.includes(q.category)) rawVal = sc.val!;
                else rawVal = sc.base!;
            }

            // Save Raw Answer (Index key)
            answersLog[idx.toString()] = rawVal;

            // Reverse Score for Calculation
            let scoredVal = rawVal;
            if (q.is_reverse_scored) scoredVal = 6 - rawVal;
            answersForScoring[q.id] = scoredVal;
        });

        // Calculate Scores
        const scores = calculatePersonalityScores(
            answersForScoring,
            questions,
            scaleNorms,
            compNorms,
            compDefsWithScales
        );

        // Insert
        await supabase.from('test_results').insert({
            test_id: testId,
            user_id: userId,
            attempt_number: i + 1,
            questions_order: questions.map(q => q.id),
            elapsed_seconds: sc.time,
            current_index: questions.length,
            answers_log: answersLog,
            completed_at: new Date(Date.now() + i * 1000).toISOString(), // Sequential time
            total_score: Math.round(scores.total.t_score),
            t_score: Math.round(scores.total.t_score),
            detailed_scores: scores
        });

        console.log(`${i + 1}. ${sc.label} -> T-Score: ${Math.round(scores.total.t_score)}`);
    }

    console.log("Done.");
}

seedDiverse();
