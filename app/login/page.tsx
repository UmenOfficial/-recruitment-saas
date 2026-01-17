'use client';

import { createClient } from '@/lib/supabase/client';
import { useRouter, useSearchParams } from 'next/navigation';
import Logo from '@/components/common/Logo';
export const dynamic = 'force-dynamic';

import { Suspense } from 'react';
import { useState } from 'react';

function LoginPageContent() {
    const supabase = await createServerSupabaseClient();
    const router = useRouter();
    const searchParams = useSearchParams();
    // Force redirect to home with loggedin flag as per user request
    const next = '/?loggedin=true';

    const [agreed, setAgreed] = useState(false);

    const handleGoogleLogin = async () => {
        if (!agreed) {
            alert('개인정보 수집 및 이용에 동의해주세요.');
            return;
        }
        try {
            const { error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
                },
            });
            if (error) throw error;
        } catch (error) {
            console.error('Error logging in:', error);
            alert('로그인 중 오류가 발생했습니다.');
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-white text-slate-900 font-sans selection:bg-[#B3E5FC] selection:text-slate-900 overflow-hidden relative">
            {/* 메인 페이지와 동일한 파스텔 배경 글로우 */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-gradient-to-br from-[#B3E5FC] via-[#E1BEE7] to-[#FFCCBC] rounded-full blur-[100px] opacity-30 -z-10"></div>

            <div className="w-full max-w-md bg-white border border-slate-100 rounded-[2.5rem] p-12 text-center shadow-xl shadow-slate-200/50 relative overflow-hidden group">
                {/* 개별 카드 글로우 포인트 */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-[#B3E5FC] rounded-full blur-[40px] opacity-10 group-hover:opacity-20 transition-opacity translate-x-1/2 -translate-y-1/2"></div>

                {/* 로고 섹션 */}
                <div className="mb-12">
                    <Logo isLink={false} className="text-3xl mb-2" />
                    <div className="w-8 h-1 bg-gradient-to-r from-blue-400 to-purple-400 mx-auto rounded-full"></div>
                </div>

                <h1 className="text-4xl font-black tracking-tighter text-slate-700 mb-4 leading-tight">
                    진심을 담는<br />
                    첫 걸음
                </h1>
                <p className="text-slate-500 font-medium mb-8">
                    당신만의 고유한 빛을 발견할 수 있도록<br />
                    U.men이 함께하겠습니다.
                </p>

                {/* Privacy Consent Section */}
                <div className="mb-6 text-left">
                    <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 mb-3">
                        <p className="text-xs font-bold text-slate-700 mb-2">[안내] 개인정보 수집 및 이용 동의</p>
                        <ul className="text-[11px] text-slate-500 space-y-1 list-disc list-inside leading-relaxed">
                            <li><strong>수집 항목</strong>: 이메일 주소, 이름</li>
                            <li><strong>수집 목적</strong>: 서비스 이용자 식별, 계정 생성 및 관리, 리포트 생성</li>
                            <li><strong>보유 기간</strong>: 회원 탈퇴 시까지</li>
                        </ul>
                    </div>
                    {/* Privacy Assurance Message */}
                    <div className="bg-blue-50/50 p-3 rounded-xl border border-blue-100 mb-4">
                        <p className="text-[11px] text-slate-500 leading-snug">
                            🔒 <span className="font-bold text-slate-600">안심하세요!</span><br />
                            저희는 불필요한 민감 정보(전화번호 등)를 절대 수집하지 않으며,
                            이메일은 오직 <span className="font-bold text-slate-600">로그인 및 결과 확인</span> 용도로만 사용됩니다.
                        </p>
                    </div>
                    <label className="flex items-center gap-2 cursor-pointer group/label">
                        <div className="relative flex items-center">
                            <input
                                type="checkbox"
                                checked={agreed}
                                onChange={(e) => setAgreed(e.target.checked)}
                                className="peer appearance-none w-5 h-5 border-2 border-slate-300 rounded-md checked:bg-indigo-500 checked:border-indigo-500 transition-colors"
                            />
                            <svg className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white opacity-0 peer-checked:opacity-100 pointer-events-none transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                        </div>
                        <span className={`text-xs font-bold transition-colors ${agreed ? 'text-indigo-600' : 'text-slate-500 group-hover/label:text-slate-700'}`}>
                            [필수] 개인정보 수집 및 이용에 동의합니다.
                        </span>
                    </label>
                </div>

                <button
                    onClick={handleGoogleLogin}
                    disabled={!agreed}
                    className={`w-full flex items-center justify-center gap-4 border py-5 rounded-2xl font-bold transition-all duration-300 group/btn shadow-sm relative overflow-hidden ${agreed
                        ? 'bg-white border-slate-100 text-slate-700 hover:shadow-lg hover:border-slate-200 cursor-pointer'
                        : 'bg-slate-50 border-slate-100 text-slate-400 cursor-not-allowed opacity-70'
                        }`}
                >
                    <div className={`absolute inset-0 bg-slate-50 opacity-0 transition-opacity ${agreed ? 'group-hover/btn:opacity-100' : ''}`}></div>
                    <svg className={`w-6 h-6 relative z-10 transition-transform duration-300 ${agreed ? 'group-hover/btn:scale-110' : ''} ${!agreed && 'grayscale opacity-50'}`} viewBox="0 0 24 24">
                        <path
                            fill="#4285F4"
                            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        />
                        <path
                            fill="#34A853"
                            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        />
                        <path
                            fill="#FBBC05"
                            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                        />
                        <path
                            fill="#EA4335"
                            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                        />
                    </svg>
                    <span className="relative z-10 text-lg">Google로 나의 가능성 확인하기</span>
                </button>

                {/* Test Login Button (Dev Only) - HIDDEN per user request */}
                {/* <button
                    onClick={async () => {
                        try {
                            const { error } = await supabase.auth.signInWithPassword({
                                email: 'test_candidate@umen.cloud',
                                password: 'test_candidate_password_123!'
                            });
                            if (error) throw error;
                            // Redirect to home with query param
                            window.location.href = next;
                        } catch (e: any) {
                            alert('테스트 로그인 실패: ' + e.message);
                        }
                    }}
                    className="mt-4 w-full text-xs text-slate-300 hover:text-slate-500 transition-colors flex items-center justify-center gap-1"
                >
                    <span>🛠️ 테스트 계정으로 로그인 (관리자용)</span>
                </button> */}

                <p className="mt-8 text-sm font-medium text-slate-400">
                    로그인 시 이용약관 및 개인정보처리방침에 동의하게 됩니다.
                </p>
            </div>
        </div>
    );
}

export default function LoginPage() {
    return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
            <LoginPageContent />
        </Suspense>
    );
}
