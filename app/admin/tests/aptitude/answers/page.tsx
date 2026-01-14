'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function AptitudeAnswerManagement() {
    const [tests, setTests] = useState<any[]>([]);
    const [selectedTestId, setSelectedTestId] = useState<string | null>(null);
    const [questions, setQuestions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // Fetch Tests
    useEffect(() => {
        fetchTests();
    }, []);

    // Fetch Questions when Test Selected
    useEffect(() => {
        if (selectedTestId) {
            fetchQuestions(selectedTestId);
        } else {
            setQuestions([]);
        }
    }, [selectedTestId]);

    const fetchTests = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('tests')
                .select('*')
                .eq('type', 'APTITUDE')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setTests(data);
            if ((data as any).length > 0 && !selectedTestId) {
                setSelectedTestId((data as any)[0].id);
            }
        } catch (error) {
            console.error(error);
            toast.error('검사 목록 로딩 실패');
        } finally {
            setLoading(false);
        }
    };

    const fetchQuestions = async (testId: string) => {
        try {
            // Get questions linked to this test
            const { data, error } = await supabase
                .from('test_questions')
                .select('question_id, order_index, questions(*)')
                .eq('test_id', testId)
                .order('order_index', { ascending: true });

            if (error) throw error;

            // Extract question data
            const qData = data.map((item: any) => ({
                ...item.questions,
                order_index: item.order_index
            }));

            setQuestions(qData);
        } catch (error) {
            console.error(error);
            toast.error('문항 로딩 실패');
        }
    };

    return (
        <div className="flex h-[calc(100vh-120px)] gap-6">
            {/* Left Sidebar: Test List */}
            <div className="w-1/4 min-w-[250px] bg-white rounded-xl border border-slate-200 overflow-hidden flex flex-col">
                <div className="p-4 border-b bg-slate-50">
                    <h2 className="font-bold text-slate-800">검사 목록</h2>
                </div>
                <div className="flex-1 overflow-y-auto p-2">
                    {tests.map(test => (
                        <button
                            key={test.id}
                            onClick={() => setSelectedTestId(test.id)}
                            className={`w-full text-left p-3 rounded-lg text-sm mb-1 transition-colors ${selectedTestId === test.id
                                ? 'bg-blue-50 text-blue-700 font-bold border border-blue-100'
                                : 'text-slate-600 hover:bg-slate-50'
                                }`}
                        >
                            <div className="line-clamp-1">{test.title}</div>
                            <div className="text-xs text-slate-400 mt-1">{test.created_at.split('T')[0]}</div>
                        </button>
                    ))}
                </div>
            </div>

            {/* Right Content: Read Only Questions & Answers */}
            <div className="flex-1 bg-white rounded-xl border border-slate-200 flex flex-col overflow-hidden">
                <div className="p-4 border-b flex justify-between items-center bg-slate-50">
                    <div>
                        <h2 className="font-bold text-slate-800">
                            {tests.find(t => t.id === selectedTestId)?.title || '검사를 선택하세요'}
                        </h2>
                        <p className="text-xs text-slate-500">총 {questions.length}문항 (정답 확인용)</p>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {questions.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-slate-400">
                            <AlertCircle size={48} className="mb-4 opacity-20" />
                            <p>등록된 문항이 없거나 검사가 선택되지 않았습니다.</p>
                        </div>
                    ) : (
                        questions.map((q, idx) => (
                            <div key={q.id} className="bg-white p-4 rounded-xl border border-slate-100 flex gap-4 items-center justify-between hover:border-blue-100 transition-colors">
                                <div className="flex gap-4 items-center flex-1">
                                    <div className="w-8 text-center font-bold text-slate-400 shrink-0">
                                        {idx + 1}
                                    </div>
                                    <div>
                                        <div className="text-xs font-bold text-blue-600 mb-1">
                                            {q.category}
                                        </div>
                                        <p className="text-black font-medium leading-relaxed">
                                            {q.content}
                                        </p>
                                    </div>
                                </div>
                                <div className="ml-4 flex flex-col items-center">
                                    <span className="text-[10px] uppercase text-slate-400 font-bold mb-1">정답</span>
                                    <div className="w-10 h-10 flex items-center justify-center border border-slate-300 rounded bg-slate-50 text-black font-bold text-lg">
                                        {q.correct_answer}
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
