
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function investigateCandidates() {
    console.log('--- Investigating Candidates Status ---');

    // Fetch recent users to match screenshot roughly
    const { data: users, error } = await supabase
        .from('users')
        .select('id, email, full_name, created_at')
        .order('created_at', { ascending: false })
        .limit(20);

    if (error || !users) {
        console.error('Error fetching users:', error);
        return;
    }

    console.log(`Found ${users.length} users. Analyzing statuses...\n`);

    for (const user of users) {
        // Fetch results for this user
        const { data: results } = await supabase
            .from('test_results')
            .select('id, total_score, completed_at, answers_log, updated_at')
            .eq('user_id', user.id);

        const attemptCount = results?.length || 0;
        const completedAttempts = results?.filter(r => r.completed_at).length || 0;
        const inProgressAttempts = results?.filter(r => !r.completed_at) || [];

        let status = '';
        let details = '';

        if (attemptCount === 0) {
            status = '미응시 (No Attempts)';
            details = '검사 시작 기록 없음 (가입만 함)';
        } else if (completedAttempts > 0) {
            const score = results?.find(r => r.completed_at)?.total_score;
            status = `완료 (Completed) - 점수: ${score}`;
            details = `${completedAttempts}회 완료`;
        } else {
            // In Progress
            status = '진행 중 / 중도 이탈 (In Progress)';
            const lastAttempt = inProgressAttempts[0];
            const answerCount = lastAttempt.answers_log ? Object.keys(lastAttempt.answers_log).length : 0;
            // Assuming full log length ~150-200 for completed, check how many answered
            details = `답변 수: ${answerCount}개 (마지막 업데이트: ${lastAttempt.updated_at ? new Date(lastAttempt.updated_at).toLocaleString('ko-KR') : 'N/A'})`;
        }

        // Identify "No Name"
        const isNoName = !user.full_name || user.full_name.trim() === '';
        const nameDisplay = isNoName ? '[이름 없음]' : user.full_name;

        // Identify Debug User
        const isDebugUser = user.email.startsWith('debug.user.') || user.email.includes('example.com');

        console.log(`User: ${nameDisplay} (${user.email})`);
        console.log(` - Type: ${isDebugUser ? 'Debug/Test Account' : 'Real User'}`);
        console.log(` - Status: ${status}`);
        console.log(` - Details: ${details}`);
        console.log('------------------------------------------------');
    }
}

investigateCandidates();
