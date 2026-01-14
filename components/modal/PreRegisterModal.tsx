'use client';

import { useState, useEffect } from 'react';
import { X, Mail, Check, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent } from '@/components/ui/dialog';

interface PreRegisterModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function PreRegisterModal({ isOpen, onClose }: PreRegisterModalProps) {
    const [email, setEmail] = useState('');
    const [agreed, setAgreed] = useState(false);
    const [loading, setLoading] = useState(false);
    const [currentCount, setCurrentCount] = useState(0);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!email.includes('@')) {
            toast.error('유효한 이메일 주소를 입력해주세요.');
            return;
        }

        if (!agreed) {
            toast.error('개인정보 수집 및 이용에 동의해주세요.');
            return;
        }

        setLoading(true);

        // Real API Call
        try {
            const response = await fetch('/api/waitlist', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, agreed_privacy: agreed })
            });

            if (!response.ok) {
                throw new Error('Failed to register');
            }

            // Success Logic
            localStorage.setItem('registered', 'true');
            toast.success('신청이 완료되었습니다! 100명이 모이면 메일로 알려드릴게요.');

            // Re-fetch count to ensure UI is in sync
            fetch('/api/waitlist')
                .then(res => res.json())
                .then(data => setCurrentCount(data.count))
                .catch(() => setCurrentCount(prev => prev + 1)); // fallback

            setTimeout(() => {
                onClose();
                setEmail('');
                setAgreed(false);
            }, 500);

        } catch (error) {
            toast.error('신청 처리 중 오류가 발생했습니다.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-md p-0 overflow-hidden bg-white rounded-3xl border-0 shadow-2xl">
                {/* Header Decoration */}
                <div className="h-32 bg-gradient-to-br from-blue-400 to-indigo-600 relative overflow-hidden flex items-center justify-center">
                    <div className="absolute top-0 left-0 w-full h-full opacity-20">
                        <div className="absolute top-[-50%] left-[-20%] w-64 h-64 bg-white rounded-full blur-[50px]"></div>
                        <div className="absolute bottom-[-50%] right-[-20%] w-64 h-64 bg-purple-500 rounded-full blur-[50px]"></div>
                    </div>
                    <Mail size={48} className="text-white relative z-10 drop-shadow-md" />

                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 text-white/70 hover:text-white transition-colors bg-black/10 hover:bg-black/20 rounded-full p-1"
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="p-8 pt-6">
                    <div className="text-center mb-8">
                        <h2 className="text-2xl font-black text-slate-800 mb-2">오픈 알림을 받아보세요</h2>
                        <p className="text-sm text-slate-500 leading-relaxed">
                            <span className="font-bold text-blue-600">100명 한정!</span> 사전 신청 시<br />
                            <span className="line-through text-slate-400 mx-1">10,000원</span>
                            <span className="font-bold text-red-500 text-lg">3,000원</span> (70% 할인) 혜택
                        </p>

                        <div className="mt-4 inline-flex items-center gap-2 px-3 py-1 bg-slate-100 rounded-full text-xs font-bold text-slate-600">
                            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                            현재 대기 인원: {currentCount}명
                        </div>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-500 ml-1">이메일 주소</label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="name@example.com"
                                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm font-medium text-slate-900 placeholder:text-slate-300"
                                required
                            />
                        </div>

                        <div className="flex items-start gap-2 pt-2">
                            <div className="relative flex items-center">
                                <input
                                    type="checkbox"
                                    id="privacy-agree"
                                    checked={agreed}
                                    onChange={(e) => setAgreed(e.target.checked)}
                                    className="peer h-4 w-4 cursor-pointer appearance-none rounded border border-slate-300 shadow-sm transition-all hover:border-blue-500 checked:bg-blue-500 checked:border-blue-500"
                                />
                                <Check size={10} className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-white opacity-0 peer-checked:opacity-100 transition-opacity" />
                            </div>
                            <label htmlFor="privacy-agree" className="text-xs text-slate-600 cursor-pointer select-none leading-snug">
                                할인 혜택 제공 및 오픈 알림 전송을 위해<br />
                                <span className="underline hover:text-slate-800">개인정보 수집 및 이용</span>에 동의합니다.
                            </label>
                        </div>

                        {/* Privacy Assurance Message */}
                        <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 mt-2">
                            <p className="text-[11px] text-slate-400 leading-snug">
                                🔒 <span className="font-bold text-slate-500">안심하세요!</span><br />
                                저희는 <span className="text-slate-500">불필요한 민감 정보(전화번호, 주소 등)</span>를 절대 수집하지 않으며,
                                이메일은 오직 <span className="text-slate-500">알림 전송</span> 용도로만 사용됩니다.
                            </p>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-3.5 bg-slate-900 text-white rounded-xl font-bold text-sm shadow-lg shadow-slate-200 hover:bg-slate-800 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:hover:scale-100"
                        >
                            {loading ? (
                                <>
                                    <Loader2 size={16} className="animate-spin" />
                                    신청 중...
                                </>
                            ) : (
                                "알림 신청하고 할인받기"
                            )}
                        </button>
                    </form>
                </div>
            </DialogContent>
        </Dialog>
    );
}
