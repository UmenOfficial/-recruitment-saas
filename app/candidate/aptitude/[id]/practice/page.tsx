'use client';

import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";

export default function AptitudePracticePage({ params }: { params: { id: string } }) {
    const [answer, setAnswer] = useState<number | null>(null);

    return (
        <div className="max-w-2xl mx-auto py-10">
            <div className="mb-8 flex items-center justify-between">
                <Link href={`/candidate/aptitude/${params.id}/guide`} className="text-slate-500 hover:text-slate-900 flex items-center gap-2">
                    <ArrowLeft size={20} />
                    유의사항으로
                </Link>
                <div className="text-sm font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded-full">
                    수리능력 예제
                </div>
            </div>

            <div className="bg-white rounded-3xl border border-slate-200 shadow-lg p-10 min-h-[400px] flex flex-col justify-between">
                <div>
                    <div className="text-sm text-slate-400 font-mono mb-4">Question.</div>
                    <h2 className="text-xl font-bold mb-8 leading-relaxed">
                        어떤 물건의 가격을 20% 인상한 후, 다시 10% 할인하여 판매했더니 10,800원이 되었다.<br />
                        이 물건의 원래 가격은 얼마인가?
                    </h2>

                    <div className="grid grid-cols-1 gap-3">
                        {[10000, 10500, 11000, 11500, 12000].map((option, idx) => (
                            <button
                                key={idx}
                                onClick={() => setAnswer(option)}
                                className={`w-full p-4 rounded-xl text-left transition-all border-2 flex justify-between items-center ${answer === option
                                        ? 'border-blue-600 bg-blue-50 text-blue-900 font-bold'
                                        : 'border-slate-100 text-slate-600 hover:border-slate-300'
                                    }`}
                            >
                                <span>{idx + 1}. {option.toLocaleString()}원</span>
                                {answer === option && <span className="text-blue-600">✓</span>}
                            </button>
                        ))}
                    </div>
                </div>

                {answer && (
                    <div className="mt-8 animate-in fade-in slide-in-from-bottom-4">
                        <div className="bg-slate-50 p-4 rounded-xl text-slate-600 text-sm mb-6">
                            💡 <strong>정답 및 해설:</strong> 1번 (10,000원)<br />
                            <span className="text-xs text-slate-500 mt-1 block">
                                원가를 X라 하면, X * 1.2 * 0.9 = 10,800<br />
                                1.08X = 10,800  ∴ X = 10,000
                            </span>
                        </div>
                        <Link
                            href={`/candidate/aptitude/${params.id}/test`}
                            className="w-full bg-slate-900 text-white py-4 rounded-xl font-bold hover:bg-slate-800 transition-colors flex items-center justify-center gap-2"
                        >
                            실전 검사 시작하기 <ArrowRight size={20} />
                        </Link>
                    </div>
                )}
            </div>
        </div>
    );
}
