'use client';

import { useEffect, useState, use } from 'react';
import { supabase } from '@/lib/supabase';
import { notFound, useRouter } from 'next/navigation';
import { Loader2, CheckCircle2, AlertTriangle, User, Save } from 'lucide-react';
import { toast, Toaster } from 'sonner';

/**
 * 게스트 평가 페이지
 * 
 * 외부 평가자가 특정 공고의 지원자들을 평가하는 블라인드 페이지입니다.
 * PII(개인식별정보)는 마스킹 처리되어 보이지 않습니다.
 * 평가는 'evaluation_scores' 테이블에 저장됩니다.
 */
// ... imports at top ...

export default function GuestEvaluationPage({ params }: { params: Promise<{ tokenId: string }> }) {
    const { tokenId } = use(params);
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [session, setSession] = useState<any>(null); // 토큰 세션 정보
    const [candidates, setCandidates] = useState<any[]>([]);
    const [selectedCandidate, setSelectedCandidate] = useState<any>(null);

    // 평가 폼 상태
    const [scores, setScores] = useState<{ [key: string]: number }>({});
    const [comment, setComment] = useState('');
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        // 토큰 검증 로직 (실제로는 서버 API를 통해 검증해야 안전하지만, 데모상 클라이언트에서 처리)
        // 실제: /api/guest/verify-token 호출
        async function init() {
            // Fetch candidates via API (to bypass RLS safely)
            try {
                const res = await fetch(`/api/guest/candidates?token=${tokenId}`);
                const data = await res.json();

                if (!res.ok) {
                    throw new Error(data.error || '지원자 목록을 불러오지 못했습니다.');
                }

                if (data.candidates) {
                    setCandidates(data.candidates);
                    setSession({ guestName: 'Guest Evaluator' });
                }
            } catch (e: any) {
                console.error(e);
                toast.error(e.message);
                if (e.message.includes('expired')) {
                    router.push('/guest/login');
                }
            } finally {
                setLoading(false);
            }
        }
        init();
    }, [tokenId]);

    // Load saved evaluation when candidate is selected
    useEffect(() => {
        if (selectedCandidate && selectedCandidate.evaluation) {
            setScores(selectedCandidate.evaluation.scores || {});
            setComment(selectedCandidate.evaluation.comments || '');
        } else {
            setScores({});
            setComment('');
        }
    }, [selectedCandidate]);

    const handleSubmitScore = async () => {
        if (!selectedCandidate) return;
        setSubmitting(true);

        try {
            const avgScore = Object.values(scores).reduce((a, b) => a + b, 0) / Object.keys(scores).length || 0;

            // API 호출
            const res = await fetch('/api/guest/evaluate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    guest_token: tokenId,
                    application_id: selectedCandidate.id,
                    score_data: scores,
                    weighted_average: avgScore,
                    comment
                })
            });

            if (!res.ok) throw new Error('평가 제출 실패');

            toast.success('평가가 저장되었습니다. 다음 지원자로 이동하세요.');

            // Refresh candidates to show updated status locally
            // Alternatively, we could just update the local state
            setCandidates(prev => prev.map(c =>
                c.id === selectedCandidate.id
                    ? { ...c, evaluation: { scores, comments: comment, weighted_average: avgScore, created_at: new Date().toISOString() } }
                    : c
            ));

        } catch (e: any) {
            toast.error(e.message);
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin" /></div>;

    const isMasked = selectedCandidate?.is_masked;

    return (
        <div className="flex h-screen bg-slate-50">
            <Toaster position="top-center" />

            {/* Resume Preview Modal Removed - Content Embedded */}

            {/* Sidebar */}
            <aside className="w-80 bg-white border-r flex flex-col">
                <div className="p-6 border-b bg-slate-900 text-white">
                    <h2 className="font-bold text-lg">MEETUP 평가 시스템</h2>
                    <p className="text-xs text-slate-400 mt-1">
                        {candidates[0]?.is_masked ? '🔒 블라인드 평가 모드' : '🔓 일반 평가 모드'}
                    </p>
                </div>
                <div className="flex-1 overflow-y-auto">
                    {candidates.map((c, idx) => (
                        <button
                            key={c.id}
                            onClick={() => setSelectedCandidate(c)}
                            className={`w-full text-left p-4 border-b hover:bg-slate-50 transition-colors flex items-center gap-3
                ${selectedCandidate?.id === c.id ? 'bg-blue-50 border-l-4 border-l-blue-600' : 'border-l-4 border-l-transparent'}
              `}
                        >
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-slate-600 ${c.evaluation ? 'bg-blue-100 text-blue-600' : 'bg-slate-200'}`}>
                                {c.evaluation ? <CheckCircle2 size={16} /> : idx + 1}
                            </div>
                            <div>
                                <p className="font-semibold text-slate-800">
                                    {c.name}
                                </p>
                                <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                                    {c.evaluation ? (
                                        <span className="bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-medium">평가 완료 ({c.evaluation.weighted_average}점)</span>
                                    ) : (
                                        <span className="bg-slate-100 px-1.5 py-0.5 rounded">점수: {c.test_results?.[0]?.total_score ?? '미응시'}</span>
                                    )}
                                </div>
                            </div>
                        </button>
                    ))}
                </div>
            </aside>

            {/* Main */}
            <main className="flex-1 flex flex-col h-screen overflow-hidden">
                {selectedCandidate ? (
                    <div className="flex-1 overflow-y-auto p-8">
                        <header className="mb-8 flex justify-between items-start">
                            <div>
                                <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                                    <User size={24} className="text-slate-400" />
                                    {selectedCandidate.name}
                                    {isMasked && <span className="text-xs bg-slate-100 text-slate-500 px-2 py-1 rounded-full font-normal">Blind Mode</span>}
                                </h1>
                                <p className="text-slate-500 mt-2 flex items-center gap-2">
                                    {isMasked ? (
                                        <>
                                            <AlertTriangle size={14} className="text-amber-500" />
                                            주의: 공정한 평가를 위해 지원자의 실명 및 개인정보는 숨겨집니다.
                                        </>
                                    ) : (
                                        <span className="text-blue-600 flex items-center gap-1">
                                            <CheckCircle2 size={14} /> 실명 확인이 가능한 일반 평가 모드입니다.
                                        </span>
                                    )}
                                </p>
                            </div>
                            <div className="flex gap-2">
                                {/* Buttons removed as content is now embedded in the layout */}
                            </div>
                        </header>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-full overflow-hidden">
                            {/* Left: Evaluation Form */}
                            <div className="bg-white p-6 rounded-xl border shadow-sm h-full overflow-y-auto custom-scrollbar">
                                <h3 className="font-bold text-lg mb-6 border-b pb-4">평가표 작성</h3>

                                <div className="space-y-8">
                                    <div className="space-y-6">
                                        <ScoreItem label="직무 적합성 (Job Fit)" value={scores['job_fit'] || 0} onChange={v => setScores({ ...scores, job_fit: v })} />
                                        <ScoreItem label="인성 및 태도 (Character)" value={scores['character'] || 0} onChange={v => setScores({ ...scores, character: v })} />
                                        <ScoreItem label="실무 역량 (Practical Skill)" value={scores['practical'] || 0} onChange={v => setScores({ ...scores, practical: v })} />
                                        <ScoreItem label="성장 잠재력 (Potential)" value={scores['potential'] || 0} onChange={v => setScores({ ...scores, potential: v })} />
                                    </div>

                                    {/* Moved: Test Results */}
                                    {/* Test Results removed as per request */}

                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-2">종합 의견</label>
                                        <textarea
                                            className="w-full h-32 p-3 border rounded-lg resize-none focus:ring-2 focus:ring-blue-500 outline-none"
                                            placeholder="지원자에 대한 구체적인 피드백을 남겨주세요."
                                            value={comment}
                                            onChange={e => setComment(e.target.value)}
                                        ></textarea>
                                    </div>
                                </div>

                                <div className="mt-8 pt-6 border-t flex justify-end sticky bottom-0 bg-white">
                                    <button
                                        onClick={handleSubmitScore}
                                        disabled={submitting}
                                        className="w-full bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-bold shadow-lg hover:shadow-blue-200 transition-all flex items-center justify-center gap-2"
                                    >
                                        {submitting ? <Loader2 className="animate-spin" /> : <><Save size={18} /> 평가 제출하기</>}
                                    </button>
                                </div>
                            </div>

                            {/* Right: Resume Preview */}
                            <div className="bg-slate-900 rounded-xl overflow-hidden flex flex-col shadow-sm h-full border border-slate-800">
                                <div className="p-3 bg-slate-800 text-white flex justify-between items-center px-4">
                                    <h3 className="font-bold flex items-center gap-2">
                                        📄 이력서 및 포트폴리오
                                        {isMasked && <span className="text-[10px] bg-amber-500/20 text-amber-500 px-1.5 py-0.5 rounded border border-amber-500/50">Blind Ver.</span>}
                                    </h3>
                                    {selectedCandidate.resume_url && (
                                        <a href={selectedCandidate.resume_url} target="_blank" rel="noreferrer" className="text-xs text-slate-400 hover:text-white underline">
                                            새 창에서 열기
                                        </a>
                                    )}
                                </div>
                                <div className="flex-1 bg-neutral-900 relative">
                                    {selectedCandidate.resume_url ? (
                                        <iframe
                                            src={selectedCandidate.resume_url}
                                            className="w-full h-full border-none bg-white"
                                            title="Resume Viewer"
                                        />
                                    ) : (
                                        <div className="flex flex-col items-center justify-center h-full text-slate-500">
                                            <p>등록된 이력서가 없습니다.</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
                        <User size={64} className="mb-4 opacity-20" />
                        <p>좌측 목록에서 지원자를 선택하여 평가를 시작하세요.</p>
                    </div>
                )}
            </main>
        </div>
    );
}

function ScoreItem({ label, value, onChange }: { label: string, value: number, onChange: (n: number) => void }) {
    return (
        <div>
            <div className="flex justify-between mb-2">
                <label className="text-sm font-medium text-slate-700">{label}</label>
                <span className="font-bold text-blue-600">{value}점</span>
            </div>
            <input
                type="range"
                min="0"
                max="100"
                value={value}
                onChange={e => onChange(Number(e.target.value))}
                className="w-full accent-blue-600"
            />
            <div className="flex justify-between text-xs text-slate-400 mt-1">
                <span>부족함</span>
                <span>탁월함</span>
            </div>
        </div>
    );
}
