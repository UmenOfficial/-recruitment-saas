'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Lock, ArrowRight, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

/**
 * 게스트(외부 평가자) 로그인 페이지
 * 
 * 토큰을 사용하여 평가 세션에 접근합니다.
 * URL에 토큰이 포함된 경우 자동으로 토큰을 입력필드에 채워줍니다.
 */
function GuestLoginContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const urlToken = searchParams.get('token');

    const [inputToken, setInputToken] = useState('');
    const [loading, setLoading] = useState(false);

    // Auto-redirect if token is present in URL
    useEffect(() => {
        if (urlToken) {
            router.replace(`/guest/evaluate/${urlToken}`);
        }
    }, [urlToken, router]);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!inputToken) return;

        setLoading(true);
        router.push(`/guest/evaluate/${inputToken}`);
    };

    // If token exists in URL, show loading state immediately (don't show form)
    if (urlToken) {
        return (
            <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4">
                <div className="text-white flex flex-col items-center gap-4">
                    <Loader2 className="w-12 h-12 animate-spin text-blue-500" />
                    <h2 className="text-xl font-bold">초대 정보 확인 중...</h2>
                    <p className="text-slate-400">잠시만 기다려주세요.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4">
            <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden">
                <div className="p-8 text-center bg-slate-50 border-b">
                    <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Lock size={32} />
                    </div>
                    <h1 className="text-2xl font-bold text-slate-900">외부 평가자 접속</h1>
                    <p className="text-slate-500 mt-2">MEETUP 보안 평가 시스템</p>
                </div>

                <div className="p-8">
                    <form onSubmit={handleLogin} className="space-y-6">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">초대 토큰 (액세스 키)</label>
                            <input
                                type="text"
                                value={inputToken}
                                onChange={(e) => setInputToken(e.target.value)}
                                placeholder="전달받은 토큰 문자열을 입력하세요"
                                className="w-full text-center font-mono text-lg border-2 border-slate-200 rounded-xl px-4 py-3 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all"
                                required
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading || !inputToken}
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl shadow-lg shadow-blue-200 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? <Loader2 className="animate-spin" /> : <>평가 시작하기 <ArrowRight size={18} /></>}
                        </button>
                    </form>
                </div>
            </div>

            <p className="mt-8 text-slate-500 text-sm">
                &copy; 2025 MEETUP. Secured by PIPA Standard.
            </p>
        </div>
    );
}

export default function GuestLoginPage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-slate-900 flex items-center justify-center text-white">Loading...</div>}>
            <GuestLoginContent />
        </Suspense>
    );
}
