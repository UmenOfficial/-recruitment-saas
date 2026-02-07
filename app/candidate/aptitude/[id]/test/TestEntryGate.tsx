'use client';

import { useState } from "react";
import { Clock, RotateCcw, Play, AlertCircle } from "lucide-react";
import { resetTestSession } from "../../actions";
import { useRouter } from "next/navigation";

interface TestEntryGateProps {
    status: 'EXPIRED' | 'INTERRUPTED' | 'VALID' | 'COMPLETED';
    testResultId: string;
    testId: string;
    children: React.ReactNode;
}

export default function TestEntryGate({ status, testResultId, testId, children }: TestEntryGateProps) {
    const [isLoading, setIsLoading] = useState(false);
    const router = useRouter();

    const handleAction = async (mode: 'full' | 'time_only' | 'recover') => {
        console.log(`[TestEntryGate] handleAction clicked: ${mode}, testResultId=${testResultId}, testId=${testId}`);
        if (!confirm("선택한 방식으로 검사를 시작하시겠습니까?")) return;

        setIsLoading(true);
        try {
            const result = await resetTestSession(testResultId, testId, mode);
            if (!result.success) {
                alert("초기화 중 오류가 발생했습니다. 관리자에게 문의하세요.");
                console.error(result.error);
                setIsLoading(false);
                return;
            }
            console.log("[TestEntryGate] Reset success. Redirecting...");

            if (mode === 'full') {
                // If restarting from scratch, go to practice page
                router.push(`/candidate/aptitude/${testId}/practice`);
            } else {
                // Otherwise reload to attempt test again
                window.location.reload();
            }
        } catch (error) {
            console.error(error);
            alert("처리 중 오류가 발생했습니다.");
            setIsLoading(false);
        }
    };

    if (status === 'VALID') {
        return <>{children}</>;
    }

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl border border-slate-200 shadow-xl p-8 max-w-md w-full text-center space-y-8 animate-in zoom-in-95 duration-200">
                <div className="flex justify-center">
                    <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center">
                        <AlertCircle size={32} />
                    </div>
                </div>

                <div>
                    <h2 className="text-2xl font-bold text-slate-900 mb-2">
                        {status === 'EXPIRED'
                            ? '검사 시간이 종료되었습니다.'
                            : status === 'COMPLETED'
                                ? '검사 완료'
                                : '검사가 중단되었습니다.'}
                    </h2>
                    <p className="text-slate-500 leading-relaxed word-keep">
                        {status === 'EXPIRED'
                            ? '제한 시간이 만료되었으나, 아직 제출하지 않으셨습니다. 아래 옵션 중 하나를 선택해 주세요.'
                            : status === 'COMPLETED'
                                ? '이미 제출된 검사입니다. 다시 시작하시겠습니까?'
                                : '이전에 진행하던 검사 기록이 있습니다. 이어서 진행하시겠습니까?'}
                    </p>
                </div>

                <div className="space-y-3">
                    {/* Common Option: Restart Full */}
                    <button
                        onClick={() => handleAction('full')}
                        disabled={isLoading}
                        className="w-full p-4 rounded-xl border-2 border-slate-100 hover:border-slate-300 hover:bg-slate-50 transition-all flex items-center gap-4 text-left group"
                    >
                        <div className="w-10 h-10 bg-slate-100 text-slate-500 rounded-lg flex items-center justify-center group-hover:bg-white group-hover:shadow-sm">
                            <RotateCcw size={20} />
                        </div>
                        <div>
                            <div className="font-bold text-slate-900">처음부터 다시 시작</div>
                            <div className="text-xs text-slate-400">모든 기록을 초기화하고 새로 시작합니다.</div>
                        </div>
                    </button>

                    {/* Scenario Specific Option */}
                    {status === 'COMPLETED' ? (
                        /* Completed only has restart option (already rendered above), so we show nothing here OR we can hide options if needed */
                        null
                    ) : status === 'EXPIRED' ? (
                        <button
                            onClick={() => handleAction('time_only')}
                            disabled={isLoading}
                            className="w-full p-4 rounded-xl border-2 border-blue-100 bg-blue-50 hover:border-blue-300 hover:bg-blue-100 transition-all flex items-center gap-4 text-left group"
                        >
                            <div className="w-10 h-10 bg-white text-blue-600 rounded-lg flex items-center justify-center shadow-sm">
                                <Clock size={20} />
                            </div>
                            <div>
                                <div className="font-bold text-blue-900">이어서 진행 (시간 리셋)</div>
                                <div className="text-xs text-blue-600/80">작성한 답안은 유지하고, 시간만 갱신합니다.</div>
                            </div>
                        </button>
                    ) : (
                        <button
                            onClick={() => handleAction('recover')}
                            disabled={isLoading}
                            className="w-full p-4 rounded-xl border-2 border-blue-100 bg-blue-50 hover:border-blue-300 hover:bg-blue-100 transition-all flex items-center gap-4 text-left group"
                        >
                            <div className="w-10 h-10 bg-white text-blue-600 rounded-lg flex items-center justify-center shadow-sm">
                                <Play size={20} />
                            </div>
                            <div>
                                <div className="font-bold text-blue-900">이어서 진행 (시간 유지)</div>
                                <div className="text-xs text-blue-600/80">중단된 시점의 남은 시간을 이어서 사용합니다.</div>
                            </div>
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
