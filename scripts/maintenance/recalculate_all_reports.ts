import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

const GLOBAL_TEST_ID = '8afa34fb-6300-4c5e-bc48-bbdb74c717d8';

// --- Scoring Logic Copied from lib/scoring.ts & lib/norm-mapper.ts ---

interface ScoringNorm {
    category_name: string;
    mean_value: number;
    std_dev_value: number;
}

interface ScoringCompetency {
    name: string;
    competency_scales: { scale_name: string }[];
}

function calculateTScore(raw: number, mean: number, stdDev: number): number {
    if (!stdDev || stdDev === 0) return 50;
    const t = 50 + 10 * ((raw - mean) / stdDev);
    return Math.max(0, Math.min(100, t));
}

function calculatePersonalityScores(
    answers: Record<string, number>,
    questions: { id: string; category: string }[],
    scaleNorms: ScoringNorm[],
    competencyNorms: ScoringNorm[],
    competencies: ScoringCompetency[]
) {
    // 1. Calculate Scale Raw Scores
    const scaleRawScores: Record<string, number> = {};

    Object.entries(answers).forEach(([qId, val]) => {
        const question = questions.find(q => q.id === qId);
        if (!question || !question.category) return;
        scaleRawScores[question.category] = (scaleRawScores[question.category] || 0) + val;
    });

    // 2. Calculate Scale T-Scores
    const scaleFinal: Record<string, { raw: number; t_score: number }> = {};
    const scaleTMapped: Record<string, number> = {};

    Object.entries(scaleRawScores).forEach(([cat, raw]) => {
        const norm = scaleNorms.find(n => n.category_name === cat);
        const mean = norm?.mean_value || 0;
        const std = norm?.std_dev_value || 1;
        const t = calculateTScore(raw, mean, std);

        scaleFinal[cat] = { raw, t_score: t };
        scaleTMapped[cat] = t;
    });

    // 3. Calculate Competency Scores
    const competencyFinal: Record<string, { raw: number; t_score: number }> = {};
    let totalRaw = 0;

    competencies.forEach(comp => {
        const scaleNames = comp.competency_scales.map(s => s.scale_name);
        let cRaw = 0;
        scaleNames.forEach(name => {
            cRaw += (scaleTMapped[name] || 0);
        });

        const cleanCompName = comp.name.replace('Comp_', '');
        const norm = competencyNorms.find(n => 
            n.category_name === comp.name || 
            n.category_name === cleanCompName ||
            `Comp_${n.category_name}` === comp.name
        );
        const mean = norm?.mean_value || 0;
        const std = norm?.std_dev_value || 1;
        const cT = calculateTScore(cRaw, mean, std);

        competencyFinal[comp.name] = { raw: cRaw, t_score: cT };
        totalRaw += cT;
    });

    // 4. Calculate Total Score
    const totalNorm = competencyNorms.find(n => n.category_name === 'TOTAL')
        || scaleNorms.find(n => n.category_name === 'TOTAL');

    const totalMean = totalNorm?.mean_value || 0;
    const totalStd = totalNorm?.std_dev_value || 1;
    const totalT = calculateTScore(totalRaw, totalMean, totalStd);

    return {
        scales: scaleFinal,
        competencies: competencyFinal,
        total: { raw: totalRaw, t_score: totalT },
        raw_total: totalRaw
    };
}

async function main() {
    console.log('=== [1/4] 전체 인성검사 재계산 및 갱신 가동 ===');

    // 1. Fetch All Personality Tests
    const { data: personalityTests } = await supabase
        .from('tests')
        .select('id, title')
        .eq('type', 'PERSONALITY');

    if (!personalityTests || personalityTests.length === 0) {
        console.log('인성검사 테스트를 찾을 수 없습니다.');
        return;
    }

    console.log(`발견된 인성검사 종류 수: ${personalityTests.length}`);

    // 2. Fetch Global Scale Norms
    const { data: globalNormsRaw } = await supabase
        .from('test_norms')
        .select('*')
        .eq('test_id', GLOBAL_TEST_ID)
        .like('category_name', 'Scale_%');

    const scaleNorms = (globalNormsRaw || []).map((n: any) => ({
        category_name: n.category_name.replace('Scale_', ''),
        mean_value: Number(n.mean_value),
        std_dev_value: Number(n.std_dev_value)
    }));

    console.log(`글로벌 척도 규준 수: ${scaleNorms.length}`);

    // 3. 테스트별 순회 처리
    for (const test of personalityTests) {
        console.log(`\n> [검사명: "${test.title}"] (${test.id}) 처리 중...`);

        // A. 로컬 규준 (Competency 및 TOTAL) 로드
        const { data: localNormsRaw } = await supabase
            .from('test_norms')
            .select('*')
            .eq('test_id', test.id);

        const competencyNorms = (localNormsRaw || [])
            .filter((n: any) => !n.category_name.startsWith('Scale_'))
            .map((n: any) => ({
                category_name: n.category_name.replace('Comp_', ''),
                mean_value: Number(n.mean_value),
                std_dev_value: Number(n.std_dev_value)
            }));

        console.log(`  - 로드된 로컬 역량 규준 수: ${competencyNorms.length}`);

        // B. 역량 매핑 리스트 로드
        const { data: comps } = await supabase
            .from('competencies')
            .select('id, name, competency_scales ( scale_name )')
            .eq('test_id', test.id);

        const compList = (comps || []).map((c: any) => ({
            name: c.name,
            competency_scales: c.competency_scales
        }));

        // C. 질문 정의 로드
        const { data: testQs } = await supabase
            .from('test_questions')
            .select('order_index, questions ( id, category, content, is_reverse_scored )')
            .eq('test_id', test.id)
            .order('order_index');

        if (!testQs || testQs.length === 0) {
            console.log(`  - [건너뜀] 문항 정보가 존재하지 않습니다.`);
            continue;
        }

        const questionsList = testQs.map(tq => ({
            id: tq.questions.id,
            category: tq.questions.category || '기타'
        }));

        // D. 갱신 대상 test_results 조회 (완료된 건만 조회)
        const { data: results, error: fetchErr } = await supabase
            .from('test_results')
            .select('id, answers_log, questions_order, user_id')
            .eq('test_id', test.id)
            .not('completed_at', 'is', null);

        if (fetchErr || !results) {
            console.error(`  - 결과 조회 실패:`, fetchErr?.message);
            continue;
        }

        console.log(`  - 재계산 대상 결과 수: ${results.length}건`);

        let updateCount = 0;

        // E. 각 결과별 T-Score 재계산 및 업데이트
        for (const res of results) {
            const answers: Record<string, number> = {};
            const log = res.answers_log as any;
            const qOrder = res.questions_order as string[] || [];

            if (!log) continue;

            if (typeof log === 'object' && log !== null) {
                Object.entries(log).forEach(([idxStr, val]) => {
                    let qData: any = null;
                    if (idxStr.length > 20) {
                        // Key가 UUID인 경우
                        const qid = idxStr;
                        const tq = testQs.find(t => t.questions.id === qid);
                        if (tq) qData = tq;
                    } else {
                        // Key가 인덱스 숫자인 경우 (셔플 질문 순서 고려 매핑)
                        const idx = parseInt(idxStr);
                        if (qOrder.length > idx) {
                            const qid = qOrder[idx];
                            const tq = testQs.find(t => t.questions.id === qid);
                            if (tq) qData = tq;
                        } else {
                            qData = testQs[idx];
                        }
                    }

                    if (qData) {
                        const parsedVal = typeof val === 'number' ? val : parseInt(val as string);
                        let raw = parsedVal;
                        if (qData.questions.is_reverse_scored) {
                            raw = 6 - raw;
                        }
                        answers[qData.questions.id] = raw;
                    }
                });
            }

            if (Object.keys(answers).length === 0) {
                console.warn(`  - [경고] Result ID ${res.id} 유효 응답 값이 없어 건너뜁니다.`);
                continue;
            }

            // 계산 적용
            const details = calculatePersonalityScores(
                answers,
                questionsList,
                scaleNorms,
                competencyNorms,
                compList
            );

            // DB 업데이트
            const finalScore = Math.round(details.total.t_score);
            const { error: updateError } = await supabase
                .from('test_results')
                .update({
                    total_score: finalScore,
                    t_score: finalScore,
                    detailed_scores: details as any
                })
                .eq('id', res.id);

            if (updateError) {
                console.error(`  - [실패] Result ID ${res.id} 업데이트 에러:`, updateError.message);
            } else {
                updateCount++;
            }
        }

        console.log(`  - ✅ 완료: ${updateCount} / ${results.length} 건 점수 갱신 성공`);
    }

    console.log('\n✅ 모든 인성검사 결과에 대한 재계산 및 DB 갱신이 완료되었습니다.');
}

main().catch(err => {
    console.error('실행 중 치명적 에러 발생:', err);
});
