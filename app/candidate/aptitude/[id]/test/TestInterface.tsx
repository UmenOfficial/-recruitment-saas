'use client';

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Clock, CheckCircle } from "lucide-react";
import { saveAptitudeAnswer, submitAptitudeTest } from "../../actions";

interface Question {
    id: string;
    content: string;
    description: string | null;
    options: any; // Json type from DB
    order_index: number;
    image_url?: string | null;
}

interface TestInterfaceProps {
    testResultId: string;
    testTitle: string;
    questions: Question[];
    initialAnswers: Record<string, number>; // questionId -> answer index
    timeLimitMinutes: number;
    startedAt: string;
}

export default function TestInterface({
    testResultId,
    testTitle,
    questions,
    initialAnswers,
    timeLimitMinutes,
    startedAt
}: TestInterfaceProps) {
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [answers, setAnswers] = useState<Record<string, number>>(initialAnswers);
    const [timeLeft, setTimeLeft] = useState<number>(0);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [timerAlertShown, setTimerAlertShown] = useState(false);
    const router = useRouter();

    const questionsSorted = [...questions].sort((a, b) => a.order_index - b.order_index);
    const currentQuestion = questionsSorted[currentQuestionIndex];
    const totalQuestions = questionsSorted.length;

    // Timer Logic (Same as before)
    useEffect(() => {
        const calculateTimeLeft = () => {
            const now = new Date().getTime();
            const start = new Date(startedAt).getTime();
            const limitMs = timeLimitMinutes * 60 * 1000;
            const end = start + limitMs;
            const remaining = Math.max(0, Math.floor((end - now) / 1000));
            return remaining;
        };

        const remaining = calculateTimeLeft();
        setTimeLeft(remaining);

        const timer = setInterval(() => {
            const updated = calculateTimeLeft();
            setTimeLeft(updated);

            if (updated <= 180 && updated > 0 && !timerAlertShown) {
                setTimerAlertShown(true);
                alert("시험 종료 3분 전입니다. 마무리해 주세요!");
            }

            if (updated <= 0) {
                clearInterval(timer);
                handleSubmit(true);
            }
        }, 1000);

        return () => clearInterval(timer);
    }, [startedAt, timeLimitMinutes, timerAlertShown]);

    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    const handleNext = () => {
        if (currentQuestionIndex < totalQuestions - 1) {
            setCurrentQuestionIndex(prev => prev + 1);
        }
    };

    const handlePrev = () => {
        if (currentQuestionIndex > 0) {
            setCurrentQuestionIndex(prev => prev - 1);
        }
    };

    const handleAnswerSelect = async (answerIndex: number) => {
        const newAnswers = { ...answers, [currentQuestion.id]: answerIndex };
        setAnswers(newAnswers);
        try {
            await saveAptitudeAnswer(testResultId, currentQuestion.id, answerIndex);
        } catch (error) {
            console.error("Failed to save answer", error);
        }
    };

    const handleSubmit = async (isAuto = false) => {
        if (!isAuto && !confirm("정말 제출하시겠습니까? 제출 후에는 수정할 수 없습니다.")) {
            return;
        }
        setIsSubmitting(true);
        try {
            await submitAptitudeTest(testResultId);
            router.push('/candidate/dashboard');
        } catch (error) {
            console.error(error);
            alert("제출 중 오류가 발생했습니다. 다시 시도해 주세요.");
            setIsSubmitting(false);
        }
    };

    const options = Array.isArray(currentQuestion.options)
        ? currentQuestion.options
        : (typeof currentQuestion.options === 'string' ? JSON.parse(currentQuestion.options) : []);

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center py-8">
            {/* Header / Timer - Rounded Box, Centered */}
            <header className="w-full max-w-7xl px-0 mb-6 sticky top-4 z-10">
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex items-center justify-between">
                    <div className="font-bold text-lg text-slate-900">{testTitle}</div>
                    <div className={`flex items-center gap-2 font-mono text-xl font-bold ${timeLeft <= 180 ? 'text-red-500 animate-pulse' : 'text-slate-700'}`}>
                        <Clock size={20} />
                        {formatTime(timeLeft)}
                    </div>
                </div>
            </header>

            <div className="flex-1 w-full max-w-7xl flex gap-6 px-4 md:px-0">
                {/* Main Question Area */}
                <main className="flex-1 bg-white rounded-3xl border border-slate-200 shadow-sm p-8 flex flex-col">

                    <div className="flex items-center justify-between mb-6">
                        <div className="text-sm font-bold text-blue-600">Question {currentQuestionIndex + 1} / {totalQuestions}</div>
                    </div>

                    <div className="flex-1">
                        {/* Question Content - Reduced Font Size (text-lg) */}
                        <div
                            className="text-lg font-bold mb-6 leading-relaxed break-keep text-slate-900"
                            dangerouslySetInnerHTML={{ __html: currentQuestion.content }}
                        />

                        {/* Condition / Description Section - Increased Font Size (text-base) */}
                        {currentQuestion.description && (
                            <div className="mb-6 p-5 bg-slate-50 rounded-xl border border-slate-100">
                                <div className="text-sm font-bold text-slate-500 mb-2">[조 건]</div>
                                <div className="text-base text-slate-700 leading-relaxed whitespace-pre-wrap">
                                    {currentQuestion.description}
                                </div>
                            </div>
                        )}

                        {/* Condition / Image Section */}
                        {currentQuestion.image_url && (
                            <div className="mb-6 p-4 bg-slate-50 rounded-xl border border-slate-100 flex justify-center">
                                <img
                                    src={currentQuestion.image_url}
                                    alt="Question Condition"
                                    className="max-w-full h-auto rounded-lg"
                                />
                            </div>
                        )}

                        {/* Options - Compact & Reduced Font */}
                        <div className="space-y-2">
                            {options.map((option: any, idx: number) => {
                                const isSelected = answers[currentQuestion.id] === idx;
                                const optionText = typeof option === 'object' && option?.text ? option.text : option;

                                return (
                                    <div key={idx} className="flex items-center gap-3">
                                        <span className={`text-base font-medium w-6 h-6 flex items-center justify-center rounded-full flex-shrink-0 ${isSelected ? 'bg-blue-600 text-white' : 'text-slate-400 bg-slate-100'}`}>
                                            {idx + 1}
                                        </span>
                                        <button
                                            onClick={() => handleAnswerSelect(idx)}
                                            className={`flex-1 p-3 rounded-xl text-left transition-all border flex justify-between items-center ${isSelected
                                                ? 'border-blue-600 bg-blue-50 text-blue-900 font-bold'
                                                : 'border-slate-100 text-slate-600 hover:border-slate-200 hover:bg-slate-50'
                                                }`}
                                        >
                                            <span className="text-base">{optionText}</span>
                                            {isSelected && <CheckCircle className="text-blue-600" size={18} />}
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Navigation Footer */}
                    <div className="mt-8 pt-6 border-t border-slate-100 flex justify-between items-center">
                        <button
                            onClick={handlePrev}
                            disabled={currentQuestionIndex === 0}
                            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-colors ${currentQuestionIndex === 0
                                ? 'text-slate-300 cursor-not-allowed'
                                : 'text-slate-600 hover:bg-slate-100'
                                }`}
                        >
                            <ArrowLeft size={18} /> 이전
                        </button>

                        {currentQuestionIndex === totalQuestions - 1 ? (
                            <button
                                onClick={() => handleSubmit(false)}
                                disabled={isSubmitting}
                                className="bg-slate-900 text-white px-6 py-2.5 rounded-xl font-bold text-sm hover:bg-slate-800 transition-colors shadow-md flex items-center gap-2"
                            >
                                {isSubmitting ? '제출 중...' : '최종 제출'}
                            </button>
                        ) : (
                            <button
                                onClick={handleNext}
                                className="bg-blue-600 text-white px-6 py-2.5 rounded-xl font-bold text-sm hover:bg-blue-700 transition-colors shadow-md shadow-blue-100 flex items-center gap-2"
                            >
                                다음 <ArrowRight size={18} />
                            </button>
                        )}
                    </div>
                </main>

                {/* Sidebar / Palette */}
                <aside className="w-72 flex-shrink-0 hidden lg:block">
                    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sticky top-24">
                        <h3 className="font-bold text-base mb-4 text-slate-900">전체 문항</h3>
                        <div className="text-xs text-slate-500 mb-4">
                            총 {Object.keys(answers).length} / {totalQuestions} 문항 풀이됨
                        </div>

                        <div className="grid grid-cols-5 gap-2">
                            {questionsSorted.map((q, idx) => {
                                const isAnswered = answers[q.id] !== undefined;
                                const isCurrent = currentQuestionIndex === idx;

                                return (
                                    <button
                                        key={q.id}
                                        onClick={() => setCurrentQuestionIndex(idx)}
                                        className={`w-full aspect-square rounded-lg font-bold text-xs flex items-center justify-center transition-all ${isCurrent
                                            ? 'ring-2 ring-blue-600 ring-offset-1 bg-white text-blue-600 border border-blue-200'
                                            : isAnswered
                                                ? 'bg-blue-600 text-white shadow-sm'
                                                : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
                                            }`}
                                    >
                                        {idx + 1}
                                    </button>
                                );
                            })}
                        </div>
                        <div className="mt-6 pt-4 border-t border-slate-100">
                            <button
                                onClick={() => handleSubmit(false)}
                                className="w-full py-2.5 border border-slate-200 text-slate-600 font-bold text-sm rounded-xl hover:bg-slate-50 hover:border-slate-300 transition-all"
                            >
                                최종 제출하기
                            </button>
                        </div>
                    </div>
                </aside>
            </div>
        </div>
    );
}
