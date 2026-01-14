'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTestStore } from '@/lib/store/test-session';
import { supabase } from '@/lib/supabase';
import { Loader2, AlertTriangle, CheckCircle, ArrowRight } from 'lucide-react';
import TestTimer from '@/components/test/TestTimer';
import AntiCheatGuard from '@/components/test/AntiCheatGuard';
import { toast } from 'sonner';
import { Database } from '@/types/database';

type Question = Database['public']['Tables']['questions']['Row'];

/**
 * 테스트 룸 페이지 (TestRoom)
 * 
 * 실제 시험이 진행되는 페이지입니다.
 * - 문제 렌더링 (객관식/주관식)
 * - 타이머 관리
 * - 안티 치팅 가드 (화면 이탈 감지)
 * - 답안 제출
 */
export default function TestRoomPage() {
    const router = useRouter();
    const {
        timeLeftSeconds,
        answers,
        violationCount,
        isActive,
        questions: storeQuestions,
        tickTimer,
        setAnswer,
        initSession,
        endSession,
        syncWithServer
    } = useTestStore();

    // Alias for compatibility
    const timeLeft = timeLeftSeconds;
    const isSubmitted = !isActive;
    const isFinished = !isActive && timeLeftSeconds === 0;

    const [currentQIndex, setCurrentQIndex] = useState(0);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [testId, setTestId] = useState<string | null>(null);

    // 1. Initialize Session (Fetch Active Test & Questions)
    useEffect(() => {
        const initialize = async () => {
            if (testId && storeQuestions.length > 0) {
                setLoading(false);
                return;
            }

            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                toast.error('로그인이 필요합니다.');
                router.push('/login');
                return;
            }

            // A. Fetch Active Test Result
            const { data: testResult, error: testError } = await supabase
                .from('test_results')
                .select(`
                    id, 
                    started_at, 
                    time_limit_minutes,
                    applications!inner(user_id)
                `)
                .eq('applications.user_id', user.id)
                .order('created_at', { ascending: false })
                .limit(1)
                .single();

            if (testResult) {
                setTestId((testResult as any).id);
            } else {
                console.warn('No active test session found (this might be a demo)');
            }

            // B. Fetch Questions based on Assigned Test
            if (storeQuestions.length === 0) {
                // 1. Get User's Application & Posting Config
                const { data: appData, error: appError } = await supabase
                    .from('applications')
                    .select(`
                        id, 
                        posting_id,
                        postings ( site_config )
                    `)
                    .eq('user_id', user.id)
                    .single();

                if (appData && (appData as any).postings) {
                    const siteConfig = (appData as any).postings.site_config || {};
                    const assignedTestId = siteConfig.test_id;

                    if (assignedTestId) {
                        // 2. Fetch Test Info (Randomness)
                        const { data: testInfo } = await supabase
                            .from('tests')
                            .select('is_random, time_limit')
                            .eq('id', assignedTestId)
                            .single();

                        const isRandom = (testInfo as any)?.is_random || false;
                        const timeLimit = (testInfo as any)?.time_limit || 60;

                        // 3. Fetch Assigned Questions
                        const { data: tqData } = await supabase
                            .from('test_questions')
                            .select(`
                                order_index,
                                questions (
                                    id, content, image_url, options, score, category, difficulty
                                )
                            `)
                            .eq('test_id', assignedTestId)
                            .order('order_index', { ascending: true });

                        if (tqData) {
                            let finalQuestions = tqData.map((item: any) => item.questions).filter(Boolean);

                            // Apply Randomization if enabled
                            if (isRandom) {
                                finalQuestions = finalQuestions.sort(() => Math.random() - 0.5);
                            }

                            initSession(finalQuestions, timeLimit);
                        } else {
                            toast.error('검사 문항을 불러올 수 없습니다.');
                        }
                        return; // Exit here if successful
                    }
                }

                // Fallback (Existing) or Error
                console.warn('No assigned test found, using fallback.');
                const { data: questionsData } = await supabase
                    .from('questions')
                    .select('*')
                    .limit(5);

                if (questionsData && questionsData.length > 0) {
                    initSession(questionsData, 60);
                }
            }

            setLoading(false);
        };

        initialize();
    }, [testId, storeQuestions.length, router, initSession]);


    // 2. Client Timer (Visual Only - Logic in Store/Server)
    useEffect(() => {
        if (isSubmitted) return;
        const timer = setInterval(() => {
            tickTimer();
        }, 1000);
        return () => clearInterval(timer);
    }, [tickTimer, isSubmitted]);


    // 3. Server Heartbeat (Fail-Safe & Sync)
    useEffect(() => {
        if (!testId || isSubmitted) return;

        const sendHeartbeat = async () => {
            try {
                const res = await fetch('/api/test/heartbeat', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ testResultId: testId })
                });

                if (res.ok) {
                    const data = await res.json();
                    if (data.status === 'ENDED') {
                        toast.error('시험 시간이 종료되었습니다.');
                        handleFinish();
                    } else {
                        // Sync time if deviation > 5 seconds
                        const serverTime = data.timeLeft;
                        if (Math.abs(timeLeft - serverTime) > 5) {
                            syncWithServer(serverTime);
                        }
                    }
                }
            } catch (error) {
                console.error('Heartbeat failed:', error);
            }
        };

        const interval = setInterval(sendHeartbeat, 30000); // 30s Heartbeat
        sendHeartbeat(); // Immediate check

        return () => clearInterval(interval);
    }, [testId, isSubmitted, timeLeft, syncWithServer]);


    // Force submit on timeout
    useEffect(() => {
        if (timeLeft <= 0 && !isSubmitted && !loading) {
            handleFinish();
        }
    }, [timeLeft, isSubmitted, loading]);


    const handleAnswer = (val: any) => {
        if (!storeQuestions[currentQIndex]) return;
        setAnswer(storeQuestions[currentQIndex].id, val);
    };

    const handleFinish = async () => {
        if (submitting || isSubmitted) return;
        setSubmitting(true);

        try {
            endSession(); // Store update

            // Server submission
            const res = await fetch('/api/test/submit', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    answers,
                    violations: violationCount,
                    timeRemaining: timeLeft
                })
            });
            // Note: even if server fails (e.g. network), local state is ended. 
            // Ideally we retry or using service worker background sync.

            router.push('/test/completed');

        } catch (e) {
            toast.error('답안 제출 중 오류가 발생했습니다. 다시 시도해주세요.');
            setSubmitting(false);
        }
    };

    if (loading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin text-blue-600" size={40} /></div>;

    const currentQ = storeQuestions[currentQIndex];
    if (!currentQ) return <div className="p-8 text-center">문제를 불러올 수 없습니다.</div>;

    // Helper: Parse options if JSON
    const getOptions = (q: Question): Array<{ text: string, imageUrl?: string | null }> | null => {
        if (!q.options) return null;
        if (Array.isArray(q.options)) {
            return q.options.map((opt: any) => {
                // Backward compatibility: Handle string options
                if (typeof opt === 'string') return { text: opt, imageUrl: null };
                // Handle object options
                return opt;
            });
        }
        return null;
    };

    const options = getOptions(currentQ);

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col">
            <AntiCheatGuard />

            {/* Header */}
            <header className="bg-white border-b px-6 py-4 flex justify-between items-center sticky top-0 z-10 shadow-sm">
                <div className="font-bold text-slate-800 flex items-center gap-2">
                    <span className="bg-slate-900 text-white px-2 py-1 rounded text-xs">MEETUP</span>
                    <span className="hidden sm:inline">프론트엔드 역량 평가</span>
                </div>
                <div className="flex items-center gap-6">
                    <div className="hidden sm:block text-sm text-slate-500">
                        문제 {currentQIndex + 1} / {storeQuestions.length}
                    </div>
                    {/* Timer Component handling its own display from store */}
                    <TestTimer />
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 max-w-4xl mx-auto w-full p-6 flex flex-col justify-center">
                <div className="bg-white rounded-2xl shadow-lg border p-8 min-h-[400px] flex flex-col">
                    <div className="mb-6 flex justify-between items-start">
                        <span className="px-3 py-1 bg-blue-50 text-blue-700 text-xs font-bold uppercase rounded-full tracking-wider">
                            {currentQ.category || 'General'}
                        </span>
                    </div>

                    {/* Question Content */}
                    <div className="mb-8">
                        <h2 className="text-xl sm:text-2xl font-bold text-slate-900 mb-4 leading-relaxed">
                            {currentQ.content}
                        </h2>
                        {/* Main Image if exists */}
                        {currentQ.image_url && (
                            <div className="mb-6 rounded-xl overflow-hidden border bg-gray-50 flex justify-center">
                                <img src={currentQ.image_url} alt="Question Reference" className="max-h-80 object-contain" />
                            </div>
                        )}
                        {/* Additional Description if exists */}
                        {/* Note: 'description' column might need to be selected in fetch query if used here, currently fetch * selects all. */}
                        {(currentQ as any).description && (
                            <div className="bg-slate-50 p-4 rounded-xl text-slate-700 whitespace-pre-wrap text-sm leading-relaxed border">
                                {(currentQ as any).description}
                            </div>
                        )}
                    </div>

                    <div className="flex-1 space-y-4">
                        {options ? (
                            // Multiple Choice
                            options.map((opt, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => handleAnswer(idx)}
                                    className={`w-full text-left p-4 rounded-xl border-2 transition-all flex items-start gap-4 group hover:shadow-md
                                        ${answers[currentQ.id] === idx
                                            ? 'border-blue-500 bg-blue-50 text-blue-800 font-medium shadow-md'
                                            : 'border-slate-100 hover:border-blue-200 hover:bg-slate-50'
                                        }`}
                                >
                                    <div className={`mt-1 min-w-[24px] h-6 rounded-full border-2 flex items-center justify-center text-xs transition-colors shrink-0
                                        ${answers[currentQ.id] === idx ? 'border-blue-500 bg-blue-500 text-white' : 'border-slate-300 group-hover:border-blue-400'}`}>
                                        {String.fromCharCode(65 + idx)}
                                    </div>
                                    <div className="flex-1 flex flex-col gap-2">
                                        {opt.imageUrl && (
                                            <div className="rounded-lg overflow-hidden border w-fit">
                                                <img src={opt.imageUrl} alt={`Option ${idx + 1}`} className="max-h-48 object-contain" />
                                            </div>
                                        )}
                                        <span className="leading-relaxed">{opt.text}</span>
                                    </div>
                                </button>
                            ))
                        ) : (
                            // Text Input
                            <textarea
                                className="w-full h-48 p-4 border rounded-xl resize-none focus:ring-2 focus:ring-blue-500 outline-none bg-slate-50 focus:bg-white transition-colors"
                                placeholder="답변을 입력해주세요..."
                                value={answers[currentQ.id] || ''}
                                onChange={(e) => handleAnswer(e.target.value)}
                            />
                        )}
                    </div>
                </div>
            </main>

            {/* Footer */}
            <footer className="bg-white border-t p-4 sm:p-6">
                <div className="max-w-3xl mx-auto flex justify-between items-center">
                    <button
                        onClick={() => setCurrentQIndex(Math.max(0, currentQIndex - 1))}
                        disabled={currentQIndex === 0}
                        className="px-6 py-3 text-slate-600 font-medium hover:bg-slate-100 rounded-xl disabled:opacity-30 transition-colors"
                    >
                        이전 문제
                    </button>

                    {currentQIndex < storeQuestions.length - 1 ? (
                        <button
                            onClick={() => setCurrentQIndex(currentQIndex + 1)}
                            className="bg-slate-900 hover:bg-slate-800 text-white px-8 py-3 rounded-xl font-bold shadow-lg hover:shadow-xl transition-all flex items-center gap-2"
                        >
                            다음 문제 <ArrowRight size={18} />
                        </button>
                    ) : (
                        <button
                            onClick={handleFinish}
                            disabled={submitting}
                            className={`bg-green-600 hover:bg-green-500 text-white px-8 py-3 rounded-xl font-bold shadow-lg hover:shadow-green-200 transition-all flex items-center gap-2 ${submitting ? 'opacity-70 cursor-wait' : ''}`}
                        >
                            {submitting ? <Loader2 className="animate-spin" /> : <><CheckCircle size={18} /> 제출하기</>}
                        </button>
                    )}
                </div>
            </footer>
        </div>
    );
}
