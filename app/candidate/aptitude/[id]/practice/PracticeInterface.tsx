'use client';

import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";

interface PracticeProblem {
    category: string;
    label: string;
    question: React.ReactNode;
    options: string[];
    correctIndex: number; // 0-based
    explanation: string;
    solution_logic: React.ReactNode;
}

interface PracticeInterfaceProps {
    id: string;
    problem: PracticeProblem;
}

export default function PracticeInterface({ id, problem }: PracticeInterfaceProps) {
    const [answer, setAnswer] = useState<number | null>(null);

    return (
        <div className="max-w-2xl mx-auto py-10">
            <div className="mb-8 flex items-center justify-between">
                <Link href={`/candidate/aptitude/${id}/guide`} className="text-slate-500 hover:text-slate-900 flex items-center gap-2">
                    <ArrowLeft size={20} />
                    유의사항으로
                </Link>
                <div className="text-sm font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded-full">
                    {problem.label}
                </div>
            </div>

            <div className="bg-white rounded-3xl border border-slate-200 shadow-lg p-10 min-h-[400px] flex flex-col justify-between">
                <div>
                    <div className="text-sm font-bold text-blue-600 mb-4">Question.</div>
                    <div className="text-xl font-bold mb-8 leading-relaxed break-keep">
                        {problem.question}
                    </div>

                    <div className="space-y-3">
                        {problem.options.map((option, idx) => (
                            <div key={idx} className="flex items-center gap-3">
                                <span className="text-lg text-slate-400 font-medium w-6 flex-shrink-0 text-center">
                                    {['①', '②', '③', '④', '⑤'][idx]}
                                </span>
                                <button
                                    onClick={() => setAnswer(idx)}
                                    className={`flex-1 p-4 rounded-xl text-left transition-all border-2 flex justify-between items-center ${answer === idx
                                        ? 'border-blue-600 bg-blue-50 text-blue-900 font-bold'
                                        : 'border-slate-100 text-slate-600 hover:border-slate-300'
                                        }`}
                                >
                                    <span>{option}</span>
                                    {answer === idx && <span className="text-blue-600">✓</span>}
                                </button>
                            </div>
                        ))}
                    </div>
                </div>

                {answer !== null && (
                    <div className="mt-8 animate-in fade-in slide-in-from-bottom-4">
                        <div className="bg-slate-50 p-6 rounded-xl text-slate-700 text-base mb-6">
                            <div className="mb-2">
                                💡 <strong className="font-bold text-slate-900">정답 및 해설:</strong> {['①', '②', '③', '④', '⑤'][problem.correctIndex]} {problem.options[problem.correctIndex]}
                            </div>
                            <div className="text-base text-slate-600 leading-relaxed">
                                {problem.solution_logic}
                            </div>
                        </div>
                        <Link
                            href={`/candidate/aptitude/${id}/test`}
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
