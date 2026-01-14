'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Lock, Mail, ArrowRight, Loader2 } from 'lucide-react';
import { toast, Toaster } from 'sonner';

/**
 * 관리자 로그인 페이지
 * 
 * 이메일과 비밀번호를 사용하여 관리자 인증을 수행합니다.
 * 인증 성공 시 관리자 대시보드로 이동합니다.
 */
export default function AdminLoginPage() {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (error) throw error;

            toast.success('로그인 성공! 대시보드로 이동합니다.');
            // router.refresh()와 router.push()의 타이밍 문제로 미들웨어가 세션을 즉시 인식하지 못할 수 있습니다.
            // 확실한 세션 갱신을 위해 hard navigation을 사용합니다.
            window.location.href = '/admin/dashboard';

        } catch (error: any) {
            toast.error('로그인 실패: 이메일 또는 비밀번호를 확인해주세요.');
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4">
            <Toaster position="top-right" />

            <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden">
                <div className="p-8 text-center bg-slate-50 border-b">
                    <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Lock size={32} />
                    </div>
                    <h1 className="text-2xl font-bold text-slate-900">관리자 로그인</h1>
                    <p className="text-slate-500 mt-2">U.men. 채용 관리 시스템</p>
                </div>

                <div className="p-8">
                    <form onSubmit={handleLogin} className="space-y-5">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">관리자 이메일</label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-3 text-slate-400" size={20} />
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="admin@example.com"
                                    className="w-full border rounded-xl pl-10 pr-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none transition-all text-black"
                                    required
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">비밀번호</label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-3 text-slate-400" size={20} />
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    className="w-full border rounded-xl pl-10 pr-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none transition-all text-black"
                                    required
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl shadow-lg shadow-blue-200 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                            {loading ? <Loader2 className="animate-spin" /> : <>로그인 <ArrowRight size={18} /></>}
                        </button>
                    </form>

                    <div className="mt-6 text-center">
                        <p className="text-xs text-slate-400">
                            &copy; U.men. Admin Console. Authorized personnel only.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
