import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

const GLOBAL_TEST_ID = '8afa34fb-6300-4c5e-bc48-bbdb74c717d8';

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

async function main() {
    console.log('=== [1/6] 기존 글로벌 Scale 규준 삭제 시작 ===');
    const { error: deleteError } = await supabase
        .from('test_norms')
        .delete()
        .eq('test_id', GLOBAL_TEST_ID)
        .like('category_name', 'Scale_%');

    if (deleteError) {
        console.error('기존 규준 삭제 실패:', deleteError.message);
        return;
    }
    console.log('기존 글로벌 Scale 규준 삭제 완료.');

    console.log('\n=== [2/6] 대상 유저 및 완료된 인성검사 결과 조회 ===');
    const { data: users, error: userError } = await supabase
        .from('users')
        .select('id, email')
        .in('email', EMAILS);

    if (userError || !users) {
        console.error('유저 조회 실패:', userError?.message || '유저 없음');
        return;
    }

    const userMap = new Map<string, string>();
    users.forEach(u => userMap.set(u.id, u.email));
    const userIds = users.map(u => u.id);

    // 인성검사 테스트(PERSONALITY) 조회
    const { data: personalityTests } = await supabase
        .from('tests')
        .select('id, title')
        .eq('type', 'PERSONALITY');

    if (!personalityTests || personalityTests.length === 0) {
        console.error('인성검사 테스트를 찾을 수 없습니다.');
        return;
    }

    const personalityTestIds = personalityTests.map(t => t.id);

    // 완료된(completed_at이 null이 아닌) 인성검사 응답 내역 조회
    const { data: results, error: resultsError } = await supabase
        .from('test_results')
        .select('id, user_id, test_id, completed_at, attempt_number, answers_log, questions_order')
        .in('user_id', userIds)
        .in('test_id', personalityTestIds)
        .not('completed_at', 'is', null);

    if (resultsError || !results) {
        console.error('테스트 결과 조회 실패:', resultsError?.message);
        return;
    }

    console.log(`정상 완료된 인성검사 결과 개수: ${results.length}`);

    console.log('\n=== [3/6] 테스트 문항 캐시 로드 ===');
    const uniqueTestIds = Array.from(new Set(results.map(r => r.test_id)));
    const questionsCache = new Map<string, any[]>();

    for (const tid of uniqueTestIds) {
        const { data: qData, error: qError } = await supabase
            .from('test_questions')
            .select('questions(id, category, is_reverse_scored)')
            .eq('test_id', tid);

        if (qError || !qData) {
            console.error(`테스트 ID ${tid} 문항 조회 실패:`, qError?.message);
            return;
        }

        const mappedQuestions = qData
            .map((qd: any) => qd.questions)
            .filter(Boolean);

        questionsCache.set(tid, mappedQuestions);
        console.log(`- 테스트 ID ${tid} (${personalityTests.find(t => t.id === tid)?.title}): 문항 ${mappedQuestions.length}개 로드 완료`);
    }

    console.log('\n=== [4/6] 각 응답(시도)별 척도 원점수 계산 ===');
    const scaleScoresMap = new Map<string, number[]>();

    results.forEach(res => {
        const email = userMap.get(res.user_id);
        const answers = res.answers_log as Record<string, any>;
        const qList = questionsCache.get(res.test_id) || [];
        const qOrder = res.questions_order as string[] || [];

        if (!answers || qList.length === 0) {
            console.warn(`[경고] Result ID: ${res.id} (유저: ${email}) 응답 정보 혹은 질문 목록이 비어있어 건너뜁니다.`);
            return;
        }

        // 해당 시도의 척도별 누적 점수 계산
        const attemptScaleScores: Record<string, number> = {};
        qList.forEach(q => {
            const rawVal = getResponseValue(answers, q.id, qOrder);
            if (rawVal !== undefined && q.category) {
                const score = q.is_reverse_scored ? (6 - rawVal) : rawVal;
                attemptScaleScores[q.category] = (attemptScaleScores[q.category] || 0) + score;
            }
        });

        // 전역 Map에 취합
        Object.entries(attemptScaleScores).forEach(([category, score]) => {
            if (!scaleScoresMap.has(category)) {
                scaleScoresMap.set(category, []);
            }
            scaleScoresMap.get(category)!.push(score);
        });
    });

    console.log(`취합된 척도 개수: ${scaleScoresMap.size}`);

    console.log('\n=== [5/6] 척도별 평균 및 표준편차 산출 ===');
    const normsToUpsert: any[] = [];

    scaleScoresMap.forEach((scores, category) => {
        const n = scores.length;
        if (n === 0) return;

        const mean = scores.reduce((sum, v) => sum + v, 0) / n;
        // 모분산 및 모표준편차 공식 적용
        const variance = scores.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / n;
        const stdDev = Math.sqrt(variance);

        normsToUpsert.push({
            test_id: GLOBAL_TEST_ID,
            category_name: `Scale_${category}`,
            mean_value: Number(mean.toFixed(4)),
            std_dev_value: Number(stdDev.toFixed(4))
        });
    });

    console.log(`새로 등록할 규준 개수: ${normsToUpsert.length}`);

    console.log('\n=== [6/6] test_norms 테이블에 규준 Upsert ===');
    const { error: upsertError } = await supabase
        .from('test_norms')
        .upsert(normsToUpsert, { onConflict: 'test_id, category_name' });

    if (upsertError) {
        console.error('규준 Upsert 실패:', upsertError.message);
        return;
    }

    console.log('✅ 성공적으로 모든 전역 척도 규준이 수립 및 저장되었습니다!');

    // 결과 출력
    console.log('\n=== [최종 산출 규준 목록] ===');
    console.log('------------------------------------------------------------');
    console.log('| 척도명 (Category)               | 평균 (Mean) | 표준편차 (SD) |');
    console.log('------------------------------------------------------------');
    normsToUpsert.sort((a, b) => a.category_name.localeCompare(b.category_name)).forEach(n => {
        console.log(`| ${n.category_name.padEnd(30)} | ${n.mean_value.toString().padEnd(11)} | ${n.std_dev_value.toString().padEnd(12)} |`);
    });
    console.log('------------------------------------------------------------');
}

main().catch(err => {
    console.error('실행 에러:', err);
});
