'use client';

import { useState, useEffect } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { useRouter } from 'next/navigation';
import { X, Sparkles, ArrowRight, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const SAMPLE_TEST_ID = '28b79003-0f40-4447-922d-bfeab706eff9';

export default function SampleTestModal() {
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const router = useRouter();
    const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    useEffect(() => {
        // Check if user is logged in
        const checkSession = async () => {
            const { data } = await supabase.auth.getSession();
            if (!data.session) {
                // Show modal after 1.5s delay for non-logged-in users
                const timer = setTimeout(() => setIsOpen(true), 1500);
                return () => clearTimeout(timer);
            }
        };
        checkSession();
    }, []);

    const handleStartSample = async () => {
        try {
            setLoading(true);

            // 1. Anonymous Login
            const { data, error } = await supabase.auth.signInAnonymously();

            if (error) throw error;

            if (data.session) {
                // 2. Redirect to Practice Page
                toast.success('체험 모드로 시작합니다!');
                // We use a query param `testId` to tell the practice page which test to eventually go to
                router.push(`/sample/practice?testId=${SAMPLE_TEST_ID}`);
            }

        } catch (error: any) {
            console.error('Anonymous login failed:', error);
            toast.error('체험 모드 시작 실패: ' + error.message);
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-300">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                onClick={() => setIsOpen(false)}
            />

            {/* Modal */}
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-300">
                {/* Decorative Header */}
                <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6 text-white text-center relaitve">
                    <button
                        onClick={() => setIsOpen(false)}
                        className="absolute top-4 right-4 text-white/70 hover:text-white transition-colors"
                    >
                        <X size={20} />
                    </button>
                    <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3 backdrop-blur-md">
                        <Sparkles size={24} className="text-yellow-300" />
                    </div>
                    <h2 className="text-xl font-bold mb-1">3분 퀵 무료 체험</h2>
                    <p className="text-blue-100 text-sm">로그인 없이 내 성향을 확인해보세요!</p>
                </div>

                {/* Content */}
                <div className="p-6">
                    <div className="space-y-4 mb-8">
                        <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                            <span className="text-2xl">⚡️</span>
                            <div className="text-sm text-slate-600">
                                <strong className="block text-slate-800">빠른 진행</strong>
                                20문항으로 가볍게 경험해보세요.
                            </div>
                        </div>
                        <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                            <span className="text-2xl">🔒</span>
                            <div className="text-sm text-slate-600">
                                <strong className="block text-slate-800">익명 보장</strong>
                                개인정보 입력 없이 즉시 시작합니다.
                            </div>
                        </div>
                    </div>

                    <button
                        onClick={handleStartSample}
                        disabled={loading}
                        className="w-full py-3.5 bg-slate-900 text-white rounded-xl font-bold text-lg hover:bg-slate-800 transition-colors flex items-center justify-center gap-2 group shadow-lg shadow-slate-200"
                    >
                        {loading ? (
                            <Loader2 className="animate-spin" />
                        ) : (
                            <>
                                지금 바로 체험하기
                                <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                            </>
                        )}
                    </button>

                    <button
                        onClick={() => setIsOpen(false)}
                        className="w-full text-center mt-4 text-slate-400 text-sm hover:text-slate-600 font-medium"
                    >
                        괜찮습니다, 나중에 할게요
                    </button>
                </div>
            </div>
        </div>
    );
}
