'use client';

import { useState } from 'react';
import { Copy, Loader2, X } from 'lucide-react';
import { toast } from 'sonner';

interface InviteGuestModalProps {
    postingId: string;
    isOpen: boolean;
    onClose: () => void;
}

/**
 * 게스트 평가자 초대 모달
 * 
 * 특정 채용 공고에 대해 외부 평가자가 접근할 수 있는 
 * 보안 토큰 링크(7일 유효)를 생성하고 복사 기능을 제공합니다.
 */
export default function InviteGuestModal({ postingId, isOpen, onClose }: InviteGuestModalProps) {
    const [guestName, setGuestName] = useState('');
    const [guestEmail, setGuestEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [generatedLink, setGeneratedLink] = useState('');

    const [stage, setStage] = useState('DOCUMENT');
    const [isMasked, setIsMasked] = useState(true);

    if (!isOpen) return null;

    const handleGenerate = async () => {
        if (!guestName.trim()) {
            toast.error('평가자 이름을 입력해주세요.');
            return;
        }
        if (!guestEmail.trim()) {
            toast.error('평가자 이메일을 입력해주세요.');
            return;
        }

        setLoading(true);
        try {
            const res = await fetch('/api/admin/guests/invite', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    posting_id: postingId,
                    guest_name: guestName,
                    guest_email: guestEmail,
                    stage,
                    is_masked: isMasked
                })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error);

            setGeneratedLink(data.inviteLink);
            toast.success('초대 링크가 생성되고 이메일로 전송되었습니다!');

        } catch (e: any) {
            toast.error(e.message);
        } finally {
            setLoading(false);
        }
    };

    const copyToClipboard = () => {
        navigator.clipboard.writeText(generatedLink);
        toast.success('클립보드에 복사되었습니다.');
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden">
                <div className="p-4 border-b flex justify-between items-center bg-slate-50">
                    <h3 className="font-bold text-slate-800">외부 평가자 초대</h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6 space-y-4">
                    {!generatedLink ? (
                        <>
                            <p className="text-sm text-slate-500">
                                외부 평가자를 위한 7일간 유효한 보안 링크를 생성하고 이메일로 전송합니다.
                            </p>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">평가 단계</label>
                                <select
                                    value={stage}
                                    onChange={(e) => setStage(e.target.value)}
                                    className="w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none bg-white mb-4"
                                >
                                    <option value="DOCUMENT">서류전형 평가</option>
                                    <option value="INTERVIEW">면접전형 평가</option>
                                </select>
                            </div>

                            <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-lg border border-slate-200 mb-4">
                                <input
                                    type="checkbox"
                                    id="blindMode"
                                    className="w-5 h-5 accent-blue-600 cursor-pointer"
                                    checked={isMasked}
                                    onChange={(e) => setIsMasked(e.target.checked)}
                                />
                                <label htmlFor="blindMode" className="cursor-pointer">
                                    <span className="block font-bold text-slate-800 text-sm">블라인드 평가 적용</span>
                                    <span className="block text-xs text-slate-500">체크 시, 평가자에게 지원자 이름과 개인정보가 가려져 보입니다.</span>
                                </label>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">평가자 이름 (식별용)</label>
                                <input
                                    type="text"
                                    value={guestName}
                                    onChange={(e) => setGuestName(e.target.value)}
                                    placeholder="예: 김교수님"
                                    className="w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none mb-4"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">평가자 이메일</label>
                                <input
                                    type="email"
                                    value={guestEmail}
                                    onChange={(e) => setGuestEmail(e.target.value)}
                                    placeholder="email@example.com"
                                    className="w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                            </div>

                            <button
                                onClick={handleGenerate}
                                disabled={loading}
                                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2 mt-4"
                            >
                                {loading ? <Loader2 className="animate-spin" /> : '초대 메일 보내기'}
                            </button>
                        </>
                    ) : (
                        <div className="space-y-4">
                            <div className="p-3 bg-green-50 text-green-700 rounded-lg text-sm text-center">
                                ✅ 초대 메일이 발송되었습니다.
                            </div>
                            <div className="flex gap-2">
                                <input
                                    readOnly
                                    value={generatedLink}
                                    className="flex-1 bg-slate-50 border rounded-lg px-3 py-2 text-sm text-slate-600 outline-none"
                                />
                                <button
                                    onClick={copyToClipboard}
                                    className="p-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg transition-colors"
                                    title="복사"
                                >
                                    <Copy size={18} />
                                </button>
                            </div>
                            <button
                                onClick={onClose}
                                className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium py-2 rounded-lg transition-colors"
                            >
                                닫기
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
