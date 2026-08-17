import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

const GLOBAL_TEST_ID = '8afa34fb-6300-4c5e-bc48-bbdb74c717d8';

const EMAILS = [
    'breadg77@gmail.com',
    'mssesh11@gmail.com',
    'gpgus1105@gmail.com',
    'a50319698@gmail.com',
    'polojuho009@gmail.com',
    'prodaum6660@gmail.com',
    'paycmh@gmail.com',
    'raks030517@gmail.com',
    '02mingi@gmail.com',
    'kimzeroxx@gmail.com',
    '2025_11226@jamsilg.hs.kr',
    'zoellanne44@gmail.com'
];

function getResponseValue(answers: Record<string, any>, qId: string, qOrder?: string[]): number | undefined {
    if (!answers) return undefined;
    if (answers[qId] !== undefined) {
        return Number(answers[qId]);
    }
    if (qOrder && qOrder.length > 0) {
        const idx = qOrder.indexOf(qId);
        if (idx !== -1 && answers[idx.toString()] !== undefined) {
            return Number(answers[idx.toString()]);
        }
    }
    return undefined;
}

function calculateTScore(raw: number, mean: number, stdDev: number): number {
    if (!stdDev || stdDev === 0) return 50;
    const t = 50 + 10 * ((raw - mean) / stdDev);
    return Math.max(0, Math.min(100, t));
}

function calculateMeanAndSD(values: number[]): { mean: number; stdDev: number } {
    const n = values.length;
    if (n === 0) return { mean: 0, stdDev: 0 };
    const mean = values.reduce((sum, v) => sum + v, 0) / n;
    const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / n;
    return { mean, stdDev: Math.sqrt(variance) };
}

async function main() {
    console.log('=== [1/5] 신규 전역 척도(Scale) 규준 로드 ===');
    const { data: globalNorms, error: globalNormsError } = await supabase
        .from('test_norms')
        .select('category_name, mean_value, std_dev_value')
        .eq('test_id', GLOBAL_TEST_ID)
        .like('category_name', 'Scale_%');

    if (globalNormsError || !globalNorms) {
        console.error('전역 척도 규준 로드 실패:', globalNormsError?.message);
        return;
    }

    const scaleNormsMap = new Map<string, { mean: number; std: number }>();
    globalNorms.forEach(n => {
        scaleNormsMap.set(n.category_name, {
            mean: Number(n.mean_value),
            std: Number(n.std_dev_value)
        });
    });
    console.log(`로드된 전역 척도 규준 수: ${scaleNormsMap.size}`);

    console.log('\n=== [2/5] 대상 유저 및 완료된 인성검사 결과 조회 ===');
    const { data: users, error: userError } = await supabase
        .from('users')
        .select('id, email')
        .in('email', EMAILS);

    if (userError || !users) {
        console.error('유저 조회 실패:', userError?.message);
        return;
    }
    const userIds = users.map(u => u.id);

    const { data: personalityTests } = await supabase
        .from('tests')
        .select('id, title')
        .eq('type', 'PERSONALITY');

    if (!personalityTests) {
        console.error('인성검사 테스트를 찾을 수 없습니다.');
        return;
    }
    const personalityTestIds = personalityTests.map(t => t.id);

    const { data: results, error: resultsError } = await supabase
        .from('test_results')
        .select('id, user_id, test_id, completed_at, attempt_number, answers_log, questions_order')
        .in('user_id', userIds)
        .in('test_id', personalityTestIds)
        .not('completed_at', 'is', null);

    if (resultsError || !results) {
        console.error('검사 결과 조회 실패:', resultsError?.message);
        return;
    }
    console.log(`분석 대상 정상 완료 결과 수: ${results.length}`);

    // 테스트별 결과 그룹화
    const resultsByTest = new Map<string, any[]>();
    results.forEach(r => {
        if (!resultsByTest.has(r.test_id)) {
            resultsByTest.set(r.test_id, []);
        }
        resultsByTest.get(r.test_id)!.push(r);
    });

    const normsToUpsert: any[] = [];
    const testPrintResults: Record<string, any[]> = {};

    console.log('\n=== [3/5] 인성검사별 역량(Competency) 및 종합(Total) 규준 계산 ===');
    for (const [testId, testResults] of resultsByTest.entries()) {
        const testTitle = personalityTests.find(t => t.id === testId)?.title || '알 수 없는 검사';
        console.log(`\n> 검사명: "${testTitle}" (${testId}) | 분석 대상 건수: ${testResults.length}건`);

        // 1. 해당 테스트의 질문 로드
        const { data: qData, error: qError } = await supabase
            .from('test_questions')
            .select('questions(id, category, is_reverse_scored)')
            .eq('test_id', testId);

        if (qError || !qData) {
            console.error(`- 문항 로드 실패 (${testId}):`, qError?.message);
            continue;
        }
        const questions = qData.map((qd: any) => qd.questions).filter(Boolean);

        // 2. 해당 테스트의 역량 및 하위 척도 구조 로드
        const { data: cData, error: cError } = await supabase
            .from('competencies')
            .select('id, name, competency_scales(scale_name)')
            .eq('test_id', testId);

        if (cError || !cData) {
            console.error(`- 역량 정보 로드 실패 (${testId}):`, cError?.message);
            continue;
        }

        const competencies = cData.map(c => ({
            name: c.name,
            scales: c.competency_scales.map((cs: any) => cs.scale_name)
        }));

        console.log(`  - 로드된 역량 수: ${competencies.length}개`);

        // 3. 각 결과마다 척도 T-Score 및 역량 Raw Score 계산
        const userLevelScores: any[] = [];

        testResults.forEach(res => {
            const answers = res.answers_log as Record<string, any>;
            const qOrder = res.questions_order as string[] || [];
            if (!answers) return;

            // A. 척도별 Raw Score 구하기
            const scaleRawScores: Record<string, number> = {};
            questions.forEach(q => {
                const rawVal = getResponseValue(answers, q.id, qOrder);
                if (rawVal !== undefined && q.category) {
                    const score = q.is_reverse_scored ? (6 - rawVal) : rawVal;
                    scaleRawScores[q.category] = (scaleRawScores[q.category] || 0) + score;
                }
            });

            // B. 척도 T-Score 구하기 (전역 척도 규준 기준)
            const scaleTScores: Record<string, number> = {};
            Object.entries(scaleRawScores).forEach(([cat, raw]) => {
                const normName = `Scale_${cat}`;
                const norm = scaleNormsMap.get(normName);
                if (norm) {
                    scaleTScores[cat] = calculateTScore(raw, norm.mean, norm.std);
                } else {
                    scaleTScores[cat] = 50;
                }
            });

            // C. 역량 Raw Score 구하기 (하위 척도 T-Score들의 합)
            const compRawScores: Record<string, number> = {};
            competencies.forEach(comp => {
                let compRaw = 0;
                comp.scales.forEach(sName => {
                    compRaw += (scaleTScores[sName] || 0);
                });
                compRawScores[comp.name] = compRaw;
            });

            userLevelScores.push({
                resultId: res.id,
                scaleTScores,
                compRawScores
            });
        });

        // 4. 역량 규준 산출 (역량 Raw Score들의 평균과 표준편차)
        const compNormsMap = new Map<string, { mean: number; std: number }>();
        competencies.forEach(comp => {
            const scores = userLevelScores.map(u => u.compRawScores[comp.name] || 0);
            const { mean, stdDev } = calculateMeanAndSD(scores);
            compNormsMap.set(comp.name, { mean, std: stdDev });

            const safeCompName = comp.name.startsWith('Comp_') ? comp.name : `Comp_${comp.name}`;
            normsToUpsert.push({
                test_id: testId,
                category_name: safeCompName,
                mean_value: Number(mean.toFixed(4)),
                std_dev_value: Number(stdDev.toFixed(4))
            });
        });

        // 5. 종합(Total) Raw Score 계산 (역량 T-Score들의 합)
        const totalScores: number[] = [];
        userLevelScores.forEach(u => {
            let totalRaw = 0;
            if (competencies.length > 0) {
                competencies.forEach(comp => {
                    const compRaw = u.compRawScores[comp.name] || 0;
                    const norm = compNormsMap.get(comp.name);
                    if (norm) {
                        const compT = calculateTScore(compRaw, norm.mean, norm.std);
                        totalRaw += compT;
                    }
                });
            } else {
                Object.values(u.scaleTScores).forEach((tVal: any) => {
                    totalRaw += tVal;
                });
            }
            totalScores.push(totalRaw);
        });

        // 6. 종합 규준 산출
        const { mean: totalMean, stdDev: totalStd } = calculateMeanAndSD(totalScores);
        normsToUpsert.push({
            test_id: testId,
            category_name: 'Comp_TOTAL',
            mean_value: Number(totalMean.toFixed(4)),
            std_dev_value: Number(totalStd.toFixed(4))
        });

        // 결과 저장
        const currentTestNorms: any[] = [];
        competencies.forEach(comp => {
            const norm = compNormsMap.get(comp.name)!;
            const safeCompName = comp.name.startsWith('Comp_') ? comp.name : `Comp_${comp.name}`;
            currentTestNorms.push({
                name: safeCompName,
                mean: norm.mean.toFixed(4),
                std: norm.std.toFixed(4)
            });
        });
        currentTestNorms.push({
            name: 'Comp_TOTAL',
            mean: totalMean.toFixed(4),
            std: totalStd.toFixed(4)
        });
        testPrintResults[testTitle] = currentTestNorms;
    }

    console.log('\n=== [4/5] test_norms 테이블에 규준 Upsert ===');
    if (normsToUpsert.length === 0) {
        console.log('업데이트할 규준 데이터가 없습니다.');
        return;
    }

    const { error: upsertError } = await supabase
        .from('test_norms')
        .upsert(normsToUpsert, { onConflict: 'test_id, category_name' });

    if (upsertError) {
        console.error('규준 Upsert 실패:', upsertError.message);
        return;
    }
    console.log(`✅ 성공적으로 ${normsToUpsert.length}개의 로컬 역량 및 종합 규준이 수립되었습니다!`);

    console.log('\n=== [5/5] 최종 산출 로컬 규준 목록 ===');
    Object.entries(testPrintResults).forEach(([title, list]) => {
        console.log(`\n* 검사명: "${title}"`);
        console.log('------------------------------------------------------------');
        console.log('| 규준명 (Category)               | 평균 (Mean) | 표준편차 (SD) |');
        console.log('------------------------------------------------------------');
        list.forEach(n => {
            console.log(`| ${n.name.padEnd(30)} | ${n.mean.padEnd(11)} | ${n.std.padEnd(12)} |`);
        });
        console.log('------------------------------------------------------------');
    });
}

main().catch(err => {
    console.error('실행 중 치명적 에러:', err);
});
