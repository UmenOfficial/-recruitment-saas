import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { sendEmail } from '@/lib/email';
import { maskData } from '@/lib/encryption'; // Just to show we care about security even here (logging maybe)

export async function POST(request: Request) {
    try {
        const supabase = await createServerSupabaseClient();
        const body = await request.json();
        const { application_id, status } = body; // 'PASS' | 'FAIL'

        if (!['PASS', 'FAIL', 'SUBMITTED', 'DOCUMENT_PASS', 'TEST_PASS', 'INTERVIEW_PASS', 'HIRED', 'REJECTED'].includes(status)) {
            return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
        }

        // 1. Update Database Status
        const { data: app, error } = await (supabase
            .from('applications') as any)
            .update({ status })
            .eq('id', application_id)
            .select('*, users(full_name, email)') // Get user info for email
            .single();

        if (error || !app) throw new Error(error?.message || 'Application not found');

        // 2. Send Notification Email ONLY for Final Decisions
        const candidateEmail = app.users?.email;
        const candidateName = app.users?.full_name || 'Candidate';

        if (candidateEmail && ['HIRED', 'REJECTED'].includes(status)) {
            if (status === 'HIRED') {
                await sendEmail({
                    to: candidateEmail,
                    subject: '축하합니다! 최종 합격 안내',
                    html: `
            <div style="font-family: sans-serif; color: #333;">
              <h2>안녕하세요, ${candidateName}님!</h2>
              <p>축하드립니다! 귀하께서는 최종 합격하셨습니다.</p>
              <p>채용팀에서 곧 입사 관련 안내를 드리기 위해 연락드릴 예정입니다.</p>
              <br/>
              <p>감사합니다,<br/>채용팀 드림</p>
            </div>
          `
                });
            } else if (status === 'REJECTED') {
                await sendEmail({
                    to: candidateEmail,
                    subject: '채용 결과 안내',
                    html: `
            <div style="font-family: sans-serif; color: #333;">
              <h2>안녕하세요, ${candidateName}님,</h2>
              <p>저희 채용 공고에 많은 관심을 가져주시고, 귀한 시간을 내어 지원해 주셔서 감사합니다.</p>
              <p>신중하게 검토하였으나, 아쉽게도 이번 채용에서는 귀하와 함께하기 어렵게 되었습니다.</p>
              <p>귀하의 앞날에 무궁한 발전이 있기를 기원합니다.</p>
              <br/>
              <p>감사합니다,<br/>채용팀 드림</p>
            </div>
          `
                });
            }
        }

        // 3. (Optional) Audit Log Trigger handled by DB or Middleware, but we can do it explicitly here for 'UPDATE_STATUS'
        // ...

        return NextResponse.json({ success: true, status });

    } catch (error: any) {
        console.error('Status Update Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
