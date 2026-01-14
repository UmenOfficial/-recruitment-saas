import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { Calendar, TrendingUp, TrendingDown, ChevronRight, Activity } from 'lucide-react';


interface Attempt {
    id: string;
    score: number;
    date: string;
    isCurrent: boolean;
    index: number;
}

export default function HistoryNavigator({
    attempts,
    testId,
    onSelectAttempt
}: {
    attempts: Attempt[],
    testId: string,
    onSelectAttempt?: (id: string) => void
}) {
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const scrollOnceRef = useRef(false);

    // Show even for 1st attempt to display the total score
    if (attempts.length === 0) return null;

    const isFirstAttempt = attempts.length === 1;

    // Statistics Calculation
    const scores = attempts.map(a => a.score);
    const growth = attempts.length > 1 ? attempts[attempts.length - 1].score - attempts[0].score : 0;
    const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
    const minScore = Math.min(...scores);
    const maxScore = Math.max(...scores);

    // Scroll to end on load if scrollable
    useEffect(() => {
        if (attempts.length > 6 && scrollContainerRef.current && !scrollOnceRef.current) {
            scrollContainerRef.current.scrollLeft = scrollContainerRef.current.scrollWidth;
            scrollOnceRef.current = true;
        }
    }, [attempts.length]);

    const renderItemContent = (attempt: Attempt) => (
        <>
            <div className={`text-[10px] font-black uppercase tracking-wider mb-1 ${attempt.isCurrent ? 'text-indigo-200' : 'text-slate-300'}`}>
                Session {attempt.index}
            </div>
            <div className="flex items-end justify-between gap-2">
                <div className="text-2xl font-black leading-none">{attempt.score.toFixed(1)}</div>
                <div className={`text-[10px] font-bold ${attempt.isCurrent ? 'text-indigo-200' : 'text-slate-400'}`}>
                    {attempt.date}
                </div>
            </div>
            {attempt.isCurrent && (
                <div className="absolute -top-1.5 -right-1.5 w-6 h-6 bg-white rounded-full flex items-center justify-center text-indigo-600 shadow-sm border border-indigo-100 scale-90">
                    <div className="w-2 h-2 bg-indigo-600 rounded-full animate-pulse" />
                </div>
            )}
        </>
    );

    const itemClassName = (isCurrent: boolean) => `relative p-4 rounded-2xl border transition-all duration-300 group text-left w-full h-full ${isCurrent
        ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-100'
        : 'bg-white border-slate-100 text-slate-600 hover:border-indigo-200 hover:bg-indigo-50/30'
        }`;

    return (
        <div className="px-4">
            <div className="bg-white border border-slate-100 rounded-[2.5rem] p-8 shadow-sm">
                <div className="flex items-center gap-3 mb-8">
                    <div className="w-10 h-10 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-500">
                        <Activity size={22} />
                    </div>
                    <div>
                        <h2 className="text-xl font-black text-slate-800 tracking-tight">응시 이력 및 성장 트렌드</h2>
                        <p className="text-xs text-slate-400 font-bold mt-0.5">
                            {isFirstAttempt
                                ? "첫 번째 응시 결과입니다. 추가 응시를 통해 나의 변화를 확인해 보세요."
                                : "회차별 결과를 선택하여 변화를 확인해 보세요."}
                        </p>
                    </div>
                </div>

                <div className="flex flex-col lg:flex-row gap-10 items-stretch">
                    {/* Attempt Selectors */}
                    <div className="flex-1">
                        {/* 
                            User Request: Show only ~4 rows (12 items).
                            Previous 480px showed 5 rows. Reducing to 380px to show 4 rows.
                        */}
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-3 gap-3 max-h-[380px] overflow-y-auto custom-scrollbar pr-2">
                            {attempts.map((attempt) => (
                                onSelectAttempt ? (
                                    <button
                                        key={attempt.id}
                                        onClick={() => onSelectAttempt(attempt.id)}
                                        className={itemClassName(attempt.isCurrent)}
                                    >
                                        {renderItemContent(attempt)}
                                    </button>
                                ) : (
                                    <Link
                                        key={attempt.id}
                                        href={`/candidate/dashboard/${attempt.id}`}
                                        className={itemClassName(attempt.isCurrent)}
                                    >
                                        {renderItemContent(attempt)}
                                    </Link>
                                )
                            ))}
                        </div>
                    </div>

                    {/* Simple Trend Visualizer */}
                    <div className="lg:w-72 bg-slate-50/50 rounded-3xl p-6 border border-slate-100 flex flex-col justify-between overflow-hidden relative">
                        <div>
                            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Growth Summary</div>
                            <div className="space-y-4">
                                {!isFirstAttempt && (
                                    <div className="flex items-center justify-between">
                                        <div className="text-sm font-bold text-slate-600">성장폭</div>
                                        <div className={`text-lg font-black flex items-center gap-1 ${growth > 0 ? 'text-green-500' : growth < 0 ? 'text-amber-500' : 'text-slate-500'}`}>
                                            {growth > 0 && <TrendingUp size={18} />}
                                            {growth < 0 && <TrendingDown size={18} />}
                                            {growth.toFixed(1)}
                                        </div>
                                    </div>
                                )}
                                <div className="flex items-center justify-between">
                                    <div className="text-sm font-bold text-slate-600">평균 점수</div>
                                    <div className="text-lg font-black text-slate-800">
                                        {avgScore.toFixed(1)}
                                    </div>
                                </div>
                                <div className="flex items-center justify-between">
                                    <div className="text-sm font-bold text-slate-600">최대 / 최소</div>
                                    <div className="text-sm font-bold text-slate-800">
                                        <span className="text-blue-600">{maxScore.toFixed(1)}</span>
                                        <span className="text-slate-300 mx-1">/</span>
                                        <span className="text-slate-500">{minScore.toFixed(1)}</span>
                                    </div>
                                </div>
                            </div>

                            {isFirstAttempt && (
                                <div className="mt-6 p-4 bg-white/60 rounded-2xl border border-white/80 shadow-sm">
                                    <p className="text-[11px] text-slate-500 font-bold leading-relaxed">
                                        성공적인 첫 응시를 축하드립니다!<br />
                                        앞으로의 변화를 기대해 주세요.
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Sparkline-like Visual */}
                        {!isFirstAttempt ? (
                            <div
                                ref={scrollContainerRef}
                                className={`mt-8 flex items-end h-40 px-1 ${attempts.length > 6
                                    ? 'overflow-x-auto justify-start gap-2 custom-scrollbar'
                                    : 'justify-between gap-1'
                                    }`}
                            >
                                {attempts.map((a, i) => {
                                    // Adjusted Scale: Min 25, Max 75 -> Now 0 ~ 100 range support?
                                    // T-Score is 0~100. Let's map 0~100 to height.
                                    // But T-Scores are mostly 20~80 range usually.
                                    // Let's keep a safer generic range map or use raw score.
                                    // Mapping 0(min visual) to 0 and 100 to 100.
                                    // Let's use 20 as floor and 80 as ceiling for visuals?
                                    // User just changed T-score range to 0~100.
                                    // Let's map 0~100 directly.
                                    const min = 0;
                                    const max = 100;
                                    const normalizedScore = ((a.score - min) / (max - min)) * 100;
                                    const barHeight = Math.min(100, Math.max(5, normalizedScore)); // Min 5% height

                                    const content = (
                                        <>
                                            {/* Tooltip on hover */}
                                            <div className="opacity-0 group-hover/bar:opacity-100 transition-opacity bg-slate-800 text-white text-[9px] py-1 px-2 rounded-md mb-1 pointer-events-none whitespace-nowrap">
                                                {a.score.toFixed(0)}점
                                            </div>

                                            <div className="relative w-full flex justify-center flex-1 items-end">
                                                <div
                                                    className={`rounded-t-full transition-all duration-700 ease-out shadow-sm ${a.isCurrent
                                                        ? 'bg-gradient-to-t from-indigo-600 to-indigo-400'
                                                        : 'bg-slate-200 group-hover/bar:bg-indigo-200'
                                                        } ${attempts.length > 6 ? 'w-full' : 'w-3 sm:w-4'}`}
                                                    style={{ height: `${barHeight}%` }}
                                                ></div>
                                            </div>

                                            <div className={`text-[9px] font-black tracking-tighter ${a.isCurrent ? 'text-indigo-600' : 'text-slate-400'}`}>
                                                {a.index}회
                                            </div>
                                        </>
                                    );

                                    const className = `h-full flex flex-col items-center justify-end gap-2 group/bar cursor-pointer ${attempts.length > 6 ? 'flex-none w-8' : 'flex-1'
                                        }`;

                                    return onSelectAttempt ? (
                                        <div
                                            key={i}
                                            onClick={() => onSelectAttempt(a.id)}
                                            className={className}
                                        >
                                            {content}
                                        </div>
                                    ) : (
                                        <Link
                                            key={i}
                                            href={`/candidate/dashboard/${a.id}`}
                                            className={className}
                                        >
                                            {content}
                                        </Link>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="mt-8 h-40 flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-2xl bg-white/30">
                                <TrendingUp size={32} className="text-slate-300 mb-2" />
                                <span className="text-[10px] font-black text-slate-300">트렌드 데이터 수집 중...</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

