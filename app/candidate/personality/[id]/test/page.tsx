'use client';

import Link from "next/link";
import { useState, useEffect, use, useRef, useCallback } from "react";
import { ArrowLeft, ArrowRight, Check, Clock, AlertTriangle } from "lucide-react";
import { supabase } from "@/lib/supabase/global-client";
import { initializeTest as initializeTestAction, saveProgressAction, resetTestAction, submitTestAction } from "./actions";
import { toast } from "sonner";
import { calculatePersonalityScores } from "@/lib/scoring";
import { useRouter } from "next/navigation";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export default function PersonalityTestPage({ params }: { params: Promise<{ id: string }> }) {
    const { id: testId } = use(params);
    const router = useRouter();

    const [questions, setQuestions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [answers, setAnswers] = useState<Record<number, number>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Timeout State
    const [showTimeoutDialog, setShowTimeoutDialog] = useState(false);
    const [showResumeDialog, setShowResumeDialog] = useState(false);
    const [pendingResultData, setPendingResultData] = useState<any | null>(null);

    // Resume & Timer State
    const [resultId, setResultId] = useState<string | null>(null);
    const [elapsedSeconds, setElapsedSeconds] = useState(0);
    const [timeLimitMinutes, setTimeLimitMinutes] = useState<number | null>(null);
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    // Refs for auto-save (to avoid stale closures)
    const currentIndexRef = useRef(currentIndex);
    const answersRef = useRef(answers);
    const elapsedSecondsRef = useRef(elapsedSeconds);
    const resultIdRef = useRef(resultId);

    // Prevent double initialization
    const initializingRef = useRef(false);

    // Sync refs
    useEffect(() => { currentIndexRef.current = currentIndex; }, [currentIndex]);
    useEffect(() => { answersRef.current = answers; }, [answers]);
    useEffect(() => { elapsedSecondsRef.current = elapsedSeconds; }, [elapsedSeconds]);
    useEffect(() => { resultIdRef.current = resultId; }, [resultId]);

    // Save Progress Function (Reads from Refs)
    const saveProgress = useCallback(async (isUrgent = false) => {
        const rId = resultIdRef.current;
        if (!rId) return;

        console.log("Saving progress...");

        try {
            await saveProgressAction(
                rId,
                currentIndexRef.current,
                answersRef.current,
                elapsedSecondsRef.current
            );
        } catch (e) {
            console.error('Save failed', e);
        }
    }, []);

    // 1. Block Back Button & Handle Unload
    useEffect(() => {
        const handlePopState = () => {
            history.pushState(null, '', location.href);
            toast.warning('검사 중에는 뒤로 갈 수 없습니다.');
        };

        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (sessionStorage.getItem('is_logout_process') === 'true') {
                return;
            }

            saveProgress(true);
            e.preventDefault();
            e.returnValue = '';
        };

        history.pushState(null, '', location.href);
        window.addEventListener('popstate', handlePopState);
        window.addEventListener('beforeunload', handleBeforeUnload);

        return () => {
            window.removeEventListener('popstate', handlePopState);
            window.removeEventListener('beforeunload', handleBeforeUnload);
            saveProgress(true);
        };
    }, [saveProgress]);

    // 2. Initial Fetch
    useEffect(() => {
        if (typeof window !== 'undefined') {
            sessionStorage.removeItem('is_logout_process');
        }

        if (!initializingRef.current) {
            initializingRef.current = true;
            initializeTest();
        }

        return () => stopTimer();
    }, [testId]);

    // 3. Timer Logic
    useEffect(() => {
        if (!loading && !isSubmitting && !showResumeDialog && !showTimeoutDialog) {
            startTimer();
        } else {
            stopTimer();
        }
        return () => stopTimer();
    }, [loading, isSubmitting, showResumeDialog, showTimeoutDialog, timeLimitMinutes]);

    const startTimer = () => {
        if (timerRef.current) return;
        timerRef.current = setInterval(() => {
            setElapsedSeconds(prev => {
                const newValue = prev + 1;

                if (timeLimitMinutes && newValue >= timeLimitMinutes * 60) {
                    stopTimer();
                    setShowTimeoutDialog(true);
                }
                return newValue;
            });
        }, 1000);
    };

    // Auto-save Effect
    useEffect(() => {
        if (elapsedSeconds > 0 && elapsedSeconds % 5 === 0) {
            saveProgress();
        }
    }, [elapsedSeconds, saveProgress]);

    const stopTimer = () => {
        if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
        }
    };
    const initializeTest = async () => {
        try {
            setLoading(true);
            console.log(`[Init] Starting initialization for testId: ${testId}`);

            const res = await initializeTestAction(testId);

            if (!res.success || !res.data) {
                if (res.redirect) router.push(res.redirect);
                else {
                    toast.error(res.error || '초기화 실패');
                }
                return;
            }

            const { test, questions: initQuestions, result, isResumed } = res.data;

            // Set Time Limit
            if (test.time_limit) setTimeLimitMinutes(test.time_limit);

            // Set Questions
            setQuestions(initQuestions);

            if (isResumed && result) {
                console.log('[Init] Resuming...', result);
                setPendingResultData(result);
                setShowResumeDialog(true);
            } else if (result) {
                console.log('[Init] New result started:', result.id);
                setResultId(result.id);
            }

        } catch (error: any) {
            console.error('Init failed:', error);
            toast.error(`검사 초기화 실패: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    // ... (shuffleArray removed - done on server) ...

    const handleResumeConfirm = async (shouldResume: boolean) => {
        setShowResumeDialog(false);
        if (shouldResume && pendingResultData) {
            // Apply pending data
            setResultId(pendingResultData.id);
            setElapsedSeconds(pendingResultData.elapsed_seconds || 0);
            setCurrentIndex(pendingResultData.current_index || 0);

            if (pendingResultData.answers_log) {
                // Ensure number keys
                const restoredAnswers: Record<number, number> = {};
                Object.entries(pendingResultData.answers_log).forEach(([k, v]) => {
                    restoredAnswers[parseInt(k)] = v as number;
                });
                setAnswers(restoredAnswers);
            }
            startTimer();
        } else {
            // Start fresh: Reset existing result logic on server
            if (pendingResultData?.id) {
                const res = await resetTestAction(pendingResultData.id);
                if (!res.success) {
                    toast.error("초기화 실패: " + res.error);
                    return;
                }
            }
            // Redirect to practice or reload to re-init?
            // Original logic diverted to practice page.
            router.push(`/candidate/personality/${testId}/practice`);
        }
    };

    const handleAnswer = async (score: number) => {
        const newAnswers = { ...answers, [currentIndex]: score };
        setAnswers(newAnswers);

        // Immediate save
        if (resultId) {
            const nextIdx = currentIndex < questions.length ? currentIndex + 1 : currentIndex;
            await saveProgressAction(resultId, nextIdx, newAnswers, elapsedSeconds);
        }

        if (currentIndex < questions.length) {
            setTimeout(() => {
                const nextIdx = currentIndex + 1;
                setCurrentIndex(nextIdx);
            }, 250);
        }
    };

    const nextQuestion = () => {
        if (answers[currentIndex] === undefined) {
            toast.warning('문항에 응답하지 않았습니다.');
            return;
        }

        if (currentIndex < questions.length) {
            const nextIdx = currentIndex + 1;
            setCurrentIndex(nextIdx);
            if (resultId) {
                saveProgressAction(resultId, nextIdx, answers, elapsedSeconds);
            }
        }
    };

    const prevQuestion = () => {
        if (currentIndex > 0) {
            setCurrentIndex(prev => prev - 1);
        }
    };

    const handleSubmit = async () => {
        if (Object.keys(answers).length < questions.length) {
            toast.error('응답하지 않은 문항이 있습니다.');
            return;
        }

        if (!resultId) {
            toast.error('세션 오류');
            return;
        }

        setIsSubmitting(true);
        stopTimer();

        try {
            // Need to convert answers (Index->Val) to ID->Val ?? 
            // In my server action implementation I contemplated this.
            // If I change server action to accept `answersLog` (Index->Val), I need `questions` ordered properly on server.
            // My server action logic `submitTestAction`:
            // 4. ... `answersMap[q.id] = answers[q.id]` <- This assumed Key=ID.
            // BUT `answers` here is Index->Score.
            // Questions are `questions`. `questions[index].id`.

            // So we MUST Map here before sending.
            const answersById: Record<string, number> = {};
            questions.forEach((q, idx) => {
                const score = answers[idx];
                if (score !== undefined) answersById[q.id] = score;
            });

            const res = await submitTestAction(resultId, testId, answersById, elapsedSeconds);

            if (res.success) {
                toast.success('검사가 완료되었습니다.');
                if (location.pathname.includes('/sample')) {
                    router.push('/sample/completed');
                } else {
                    router.push('/candidate/dashboard');
                }
            } else {
                throw new Error(res.error);
            }

        } catch (error: any) {
            console.error("Submit error:", error);
            toast.error(`제출 중 오류: ${error.message}`);
            setIsSubmitting(false);
        }
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}분 ${secs < 10 ? '0' : ''}${secs}초`;
    };

    const getTimeDisplay = () => {
        if (!timeLimitMinutes) return formatTime(elapsedSeconds);
        const limitSeconds = timeLimitMinutes * 60;
        const remaining = Math.max(0, limitSeconds - elapsedSeconds);
        return formatTime(remaining);
    };

    const progressPercent = questions.length > 0 ? (Object.keys(answers).length / questions.length) * 100 : 0;

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    if (questions.length === 0) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center p-4">
                <div className="text-xl font-bold text-slate-800 mb-4">등록된 문항이 없습니다.</div>
                <button onClick={() => router.back()} className="text-blue-600 hover:underline">돌아가기</button>
            </div>
        );
    }

    return (
        <div className="w-full py-10 overflow-hidden min-h-screen flex flex-col select-none">
            <div className="max-w-4xl mx-auto w-full px-6 mb-8 flex flex-wrap md:flex-nowrap items-center justify-between shrink-0">
                <div className="flex items-center gap-4 order-1">
                    <div className="flex items-center gap-2 text-slate-500">
                        <span className="font-bold text-slate-900">검사 진행 중</span>
                    </div>
                </div>

                <div className={`
                    flex items-center gap-2 px-4 py-2 rounded-full font-mono font-bold shadow-sm border transition-all duration-300
                    order-3 w-full justify-center mt-4 md:w-auto md:order-2 md:mt-0
                    ${timeLimitMinutes && ((timeLimitMinutes * 60 - elapsedSeconds) <= 300)
                        ? 'bg-red-50 text-red-600 border-red-200 animate-pulse text-2xl px-6'
                        : 'bg-white text-slate-700 border-slate-200 text-lg'}
                `}>
                    <Clock size={timeLimitMinutes && ((timeLimitMinutes * 60 - elapsedSeconds) <= 300) ? 24 : 20} />
                    {getTimeDisplay()}
                </div>

                <div className="text-sm font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded-full order-2 md:order-3">
                    {Object.keys(answers).length}/{questions.length}
                </div>
            </div>

            {/* Progress Bar with Animation */}
            <div className="max-w-4xl mx-auto w-full px-6 mb-8">
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden w-full relative">
                    <div
                        className="h-full bg-blue-600 transition-all duration-1000 ease-[cubic-bezier(0.4,0,0.2,1)] relative overflow-hidden"
                        style={{ width: `${progressPercent}%` }}
                    >
                        {/* Shimmer Overlay */}
                        <div className="absolute top-0 left-0 bottom-0 right-0 w-full h-full bg-gradient-to-r from-transparent via-white/40 to-transparent -translate-x-full animate-shimmer" />
                    </div>
                </div>
            </div>

            <div className="flex-1 relative flex flex-col justify-center">
                <div
                    className="flex transition-transform duration-500 ease-in-out [--gap:24px] [--card-width:80vw] md:[--card-width:600px]"
                    style={{
                        transform: `translateX(calc(50% - ((var(--card-width) - var(--gap)) / 2) - (${currentIndex} * var(--card-width))))`
                    }}
                >
                    {questions.map((q, idx) => {
                        const isCurrent = idx === currentIndex;
                        // Optimization: Only render items close to current index to prevent DOM overload
                        const shouldRender = Math.abs(currentIndex - idx) <= 2;

                        if (!shouldRender) {
                            return (
                                <div
                                    key={q.id || idx}
                                    className="shrink-0 pr-[24px]"
                                    style={{ width: 'var(--card-width)' }}
                                    aria-hidden="true"
                                />
                            );
                        }

                        const defaultOptions = ["전혀 그렇지 않다", "그렇지 않다", "보통이다", "그렇다", "매우 그렇다"];
                        const rawOptions = (q.options && Array.isArray(q.options) && q.options.length > 0)
                            ? q.options
                            : defaultOptions;

                        return (
                            <div
                                key={q.id || idx}
                                className="shrink-0 pr-[24px]"
                                style={{ width: 'var(--card-width)' }}
                            >
                                <div className={`
                                    w-full h-full bg-white rounded-3xl border shadow-xl p-8 md:p-12 transition-all duration-500
                                    ${isCurrent ? 'opacity-100 scale-100 border-slate-200 shadow-slate-200/50' : 'opacity-40 scale-95 border-slate-100 blur-[1px]'}
                                `}>
                                    <div className="h-[140px] flex items-center justify-center mb-10">
                                        <h2 className="text-2xl md:text-3xl font-bold leading-relaxed text-center whitespace-pre-line text-slate-800 break-keep">
                                            {q.content}
                                        </h2>
                                    </div>

                                    <div className="space-y-3">
                                        {rawOptions.map((option: any, optIdx: number) => {
                                            const score = optIdx + 1;
                                            const isSelected = answers[idx] === score;

                                            let optionText = null;
                                            // 1. If it's a string, might be JSON or plain text
                                            if (typeof option === 'string') {
                                                if (option.trim().startsWith('{')) {
                                                    try {
                                                        const parsed = JSON.parse(option);
                                                        if (parsed && typeof parsed === 'object') {
                                                            optionText = parsed.text || parsed.content || parsed.label || parsed.value;
                                                        } else {
                                                            optionText = option;
                                                        }
                                                    } catch (e) {
                                                        optionText = option;
                                                    }
                                                } else {
                                                    optionText = option;
                                                }
                                            }

                                            // 2. If it's an object
                                            else if (typeof option === 'object' && option !== null) {
                                                optionText = option.text || option.content || option.label || option.value;
                                            }

                                            // Fallback to default options if text is missing or "옵션"
                                            if (!optionText || (typeof optionText === 'string' && optionText.trim() === '')) {
                                                optionText = defaultOptions[optIdx] || "옵션";
                                            }

                                            return (
                                                <button
                                                    key={score}
                                                    onClick={() => {
                                                        if (isCurrent) {
                                                            handleAnswer(score);
                                                            // Navigation logic is now inside handleAnswer's timeout
                                                        }
                                                    }}
                                                    disabled={!isCurrent}
                                                    className={`
                                                        w-full p-4 rounded-xl text-left transition-all duration-200 border-2 flex items-center justify-between group
                                                        ${isSelected
                                                            ? 'border-blue-600 bg-blue-50 text-blue-700 font-bold shadow-md'
                                                            : 'border-slate-100 text-slate-900 hover:border-blue-200 hover:bg-slate-50'
                                                        }
                                                        ${!isCurrent ? 'cursor-default' : 'cursor-pointer'}
                                                    `}
                                                >
                                                    <span className="text-slate-900 font-medium text-lg">{optionText}</span>
                                                    {isSelected && (
                                                        <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center animate-in zoom-in">
                                                            <Check size={14} className="text-white bg-blue-600" />
                                                        </div>
                                                    )}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        );
                    })}

                    {/* Completion Card */}
                    <div
                        className="shrink-0 pr-[24px]"
                        style={{ width: 'var(--card-width)' }}
                    >
                        <div className={`
                            w-full h-full bg-white rounded-3xl border shadow-xl p-8 md:p-12 transition-all duration-500 flex flex-col items-center justify-center text-center
                            ${currentIndex === questions.length ? 'opacity-100 scale-100 border-slate-200 shadow-slate-200/50' : 'opacity-40 scale-95 border-slate-100 blur-[1px]'}
                        `}>
                            <div className="w-20 h-20 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mb-6 animate-in zoom-in duration-500">
                                <Check size={40} strokeWidth={3} />
                            </div>
                            <h2 className="text-2xl md:text-3xl font-bold mb-4 text-slate-900">
                                모든 문항에 답변했습니다!
                            </h2>
                            <p className="text-slate-600 mb-8 leading-relaxed">
                                수고하셨습니다.<br />
                                아래 버튼을 눌러 검사 결과를 제출해 주세요.
                            </p>

                            <button
                                onClick={handleSubmit}
                                disabled={isSubmitting}
                                className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 shadow-lg shadow-blue-200/50 text-lg group disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isSubmitting ? '제출 중...' : '검사 제출하기'} <Check size={20} className="group-hover:scale-110 transition-transform" />
                            </button>
                        </div>
                    </div>
                </div>

                <div className="absolute top-1/2 -translate-y-1/2 w-full max-w-4xl left-1/2 -translate-x-1/2 flex justify-between pointer-events-none px-4">
                    <button
                        onClick={prevQuestion}
                        disabled={currentIndex === 0}
                        className={`
                            pointer-events-auto w-12 h-12 rounded-full bg-white border border-slate-200 shadow-lg flex items-center justify-center text-slate-600 transition-all
                            ${currentIndex === 0 ? 'opacity-0 translate-x-4' : 'opacity-100 hover:bg-slate-50 hover:scale-110'}
                        `}
                    >
                        <ArrowLeft size={24} />
                    </button>

                    {/* Hide Right Arrow on Last Card (Completion) */}
                    <button
                        onClick={nextQuestion}
                        disabled={currentIndex >= questions.length}
                        className={`
                            pointer-events-auto w-12 h-12 rounded-full bg-white border border-slate-200 shadow-lg flex items-center justify-center text-slate-600 transition-all
                            ${currentIndex >= questions.length ? 'opacity-0 -translate-x-4' : 'opacity-100 hover:bg-slate-50 hover:scale-110'}
                        `}
                    >
                        <ArrowRight size={24} />
                    </button>
                </div>
            </div>

            <div className="h-24 sticky bottom-0 flex items-center justify-center shrink-0">
                {currentIndex < questions.length && (
                    <p className="text-slate-400 text-sm font-medium">
                        답변을 선택하면 다음 문항으로 넘어갑니다
                    </p>
                )}
            </div>
            {/* Resume Confirmation Dialog */}
            <Dialog open={showResumeDialog} onOpenChange={setShowResumeDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>검사 이어하기</DialogTitle>
                        <DialogDescription>
                            이전에 진행하던 검사 기록이 있습니다.<br />
                            마지막으로 풀던 문항부터 계속 진행하시겠습니까?
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => handleResumeConfirm(false)}>
                            아니오 (처음부터)
                        </Button>
                        <Button onClick={() => handleResumeConfirm(true)}>
                            네 (이어하기)
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Timeout Dialog */}
            <Dialog open={showTimeoutDialog} onOpenChange={() => { }}>
                <DialogContent className="sm:max-w-md [&>button]:hidden">
                    <DialogHeader>
                        <div className="mx-auto w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mb-4 text-red-600">
                            <Clock size={24} />
                        </div>
                        <DialogTitle className="text-center text-xl">검사 시간 종료</DialogTitle>
                        <DialogDescription className="text-center pt-2 leading-relaxed">
                            검사 시간 내에 모든 문항에 응답하지 못했습니다.<br />
                            조금 더 빠르게 문항을 읽고 응답하는 연습을 하시기 바랍니다.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex flex-col gap-3 mt-4">
                        <Button
                            className="w-full bg-blue-600 hover:bg-blue-700"
                            size="lg"
                            onClick={async () => {
                                if (resultId) {
                                    const { success, error } = await resetTestAction(resultId);
                                    if (!success) {
                                        toast.error("초기화 실패: " + error);
                                        return;
                                    }
                                }
                                router.push(`/candidate/personality/${testId}/practice`);
                            }}
                        >
                            재응시하기 (처음부터 다시)
                        </Button>
                        <Button
                            variant="outline"
                            className="w-full"
                            size="lg"
                            onClick={() => router.push('/')}
                        >
                            검사 종료하기 (메인으로)
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
