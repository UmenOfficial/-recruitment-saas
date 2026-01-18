'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/global-client';
import { fetchPersonalityTestsAction, createPersonalityTestAction, updatePersonalityTestAction, deletePersonalityTestAction } from './actions';
import { Plus, Search, FileText, Clock, ChevronRight, MoreVertical, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

interface Test {
    id: string;
    title: string;
    description: string;
    type: 'APTITUDE' | 'PERSONALITY';
    status: 'DRAFT' | 'ACTIVE' | 'ARCHIVED';
    time_limit: number | null;
    created_at: string;
    question_count?: number; // Joined count
}

export default function PersonalityTestManagement() {
    const [tests, setTests] = useState<Test[]>([]);
    const [loading, setLoading] = useState(true);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

    // Create Form State
    const [newTest, setNewTest] = useState({
        title: '',
        description: '',
        time_limit: 30
    });

    useEffect(() => {
        fetchTests();
    }, []);

    const fetchTests = async () => {
        setLoading(true);
        try {
            const res = await fetchPersonalityTestsAction();
            if (res.success) {
                setTests(res.data || []);
            } else {
                toast.error('검사 목록 로딩 실패: ' + res.error);
            }
        } catch (error) {
            console.error(error);
            toast.error('오류가 발생했습니다.');
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newTest.title.trim()) return toast.error('검사명을 입력해주세요.');

        try {
            const res = await createPersonalityTestAction(newTest.title, newTest.description, newTest.time_limit);
            if (res.success) {
                toast.success('새로운 검사가 생성되었습니다.');
                setIsCreateModalOpen(false);
                setNewTest({ title: '', description: '', time_limit: 30 });
                fetchTests();
            } else {
                toast.error("생성 실패: " + res.error);
            }
        } catch (error: any) {
            toast.error('오류가 발생했습니다.');
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('정말 삭제하시겠습니까? 관련 데이터가 모두 삭제됩니다.')) return;

        try {
            const res = await deletePersonalityTestAction(id);
            if (res.success) {
                toast.success('검사가 삭제되었습니다.');
                fetchTests();
            } else {
                toast.error("삭제 실패: " + res.error);
            }
        } catch (error: any) {
            toast.error('오류가 발생했습니다.');
        }
    };

    const [editingTest, setEditingTest] = useState<Test | null>(null);

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingTest || !editingTest.title.trim()) return;

        try {
            const res = await updatePersonalityTestAction(
                editingTest.id,
                editingTest.title,
                editingTest.description,
                editingTest.time_limit
            );

            if (res.success) {
                toast.success('검사 정보가 수정되었습니다.');
                setEditingTest(null);
                fetchTests();
            } else {
                toast.error("수정 실패: " + res.error);
            }
        } catch (error: any) {
            toast.error('오류가 발생했습니다.');
        }
    };

    return (
        <div className="space-y-6">
            {/* ... Header ... */}
            <div className="flex justify-between items-end">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">인성검사 관리</h1>
                    <p className="text-slate-500">채용 전형에 사용할 인성검사지를 만들고 관리합니다.</p>
                </div>
                <button
                    onClick={() => setIsCreateModalOpen(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors font-medium"
                >
                    <Plus size={18} />
                    새 검사 만들기
                </button>
            </div>

            {loading ? (
                <div className="text-center py-12">
                    <div className="animate-spin w-8 h-8 border-2 border-slate-200 border-t-slate-800 rounded-full mx-auto mb-4"></div>
                    <p className="text-slate-400">데이터를 불러오는 중...</p>
                </div>
            ) : tests.length === 0 ? (
                <div className="bg-white p-12 rounded-xl border border-dashed border-slate-300 text-center text-slate-400">
                    <FileText size={48} className="mx-auto mb-4 opacity-20" />
                    <p>등록된 인성검사가 없습니다.</p>
                    <button
                        onClick={() => setIsCreateModalOpen(true)}
                        className="text-blue-600 hover:underline mt-2 font-medium"
                    >
                        첫 번째 검사를 만들어보세요
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {tests.map(test => (
                        <div
                            key={test.id}
                            onClick={() => setEditingTest(test)}
                            className="group bg-white rounded-xl border border-slate-200 p-5 hover:shadow-lg transition-all hover:border-blue-200 flex flex-col h-[280px] cursor-pointer"
                        >
                            <div className="flex justify-between items-start mb-3">
                                <span className={`px-2 py-1 rounded text-xs font-bold ${test.status === 'ACTIVE' ? 'bg-green-100 text-green-700' :
                                    test.status === 'DRAFT' ? 'bg-slate-100 text-slate-600' :
                                        'bg-red-50 text-red-600'
                                    }`}>
                                    {test.status === 'ACTIVE' ? '사용중' : test.status === 'DRAFT' ? '작성중' : '보관됨'}
                                </span>
                                <div className="relative">
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation(); // Prevent modal open
                                            handleDelete(test.id);
                                        }}
                                        className="p-1 text-slate-300 hover:text-red-500 transition-colors"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>

                            <div className="flex-1">
                                <h3 className="text-lg font-bold text-slate-800 mb-1 line-clamp-1 group-hover:text-blue-600 transition-colors">
                                    {test.title}
                                </h3>
                                <p className="text-sm text-slate-500 line-clamp-2 h-10 mb-4">
                                    {test.description || '설명이 없습니다.'}
                                </p>

                                <div className="flex items-center gap-4 text-xs font-medium text-slate-500 border-t pt-4 mt-auto">
                                    <div className="flex items-center gap-1.5">
                                        <FileText size={14} />
                                        <span>문항 {test.question_count || 0}개</span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <Clock size={14} />
                                        <span>{test.time_limit ? `${test.time_limit}분` : '시간제한 없음'}</span>
                                    </div>
                                </div>
                            </div>

                            <Link
                                href={`/admin/tests/personality/${test.id}`}
                                onClick={(e) => e.stopPropagation()} // Prevent modal open
                                className="mt-4 flex items-center justify-center w-full py-2 bg-slate-50 hover:bg-blue-50 text-slate-600 hover:text-blue-700 rounded-lg transition-colors text-sm font-bold gap-1"
                            >
                                관리하기 <ChevronRight size={14} />
                            </Link>
                        </div>
                    ))}
                </div>
            )}

            {/* Create Modal */}
            {isCreateModalOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200">
                        <div className="p-6 border-b">
                            <h2 className="text-xl font-bold text-slate-900">새 인성검사 만들기</h2>
                        </div>
                        <form onSubmit={handleCreate} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-black mb-1">검사명 <span className="text-red-500">*</span></label>
                                <input
                                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg text-black placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-black"
                                    placeholder="예: 2024년 인성검사 A형"
                                    value={newTest.title}
                                    onChange={(e) => setNewTest({ ...newTest, title: e.target.value })}
                                    autoFocus
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-black mb-1">설명</label>
                                <textarea
                                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg text-black placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-black resize-none h-24"
                                    placeholder="검사에 대한 간단한 설명을 입력하세요."
                                    value={newTest.description}
                                    onChange={(e) => setNewTest({ ...newTest, description: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-black mb-1">제한 시간 (분)</label>
                                <input
                                    type="number"
                                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg text-black placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-black"
                                    value={newTest.time_limit ?? ''}
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        setNewTest({
                                            ...newTest,
                                            // Handle empty string as 0 or null depending on preference, 
                                            // but since state init is 30, let's allow empty string behaviorally if we changed type
                                            // Ideally type match. newTest.time_limit is inferred as number.
                                            // We might need to cast or allow it to be number | string temporarily?
                                            // Looking at state def: const [newTest, setNewTest] = useState({... time_limit: 30 })
                                            // So it expects number. 
                                            // If we want empty, we might need to handle it.
                                            // But for create form, defaulting to 0 or keeping it number is safer IF we don't change state type.
                                            // However, to fix "045", we need to allow intermediate empty state.
                                            // Let's stick with (val === '' ? 0 : parseInt(val)) for now if type is strict, 
                                            // OR update state type.
                                            // But wait, the edit form state IS number | null.
                                            // The create form state is inferred from { time_limit: 30 } -> number.
                                            // Let's convert to any or allow formatting.
                                            time_limit: val === '' ? 0 : parseInt(val)
                                        } as any)
                                    }}
                                    min={0}
                                />
                            </div>
                            <div className="flex gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsCreateModalOpen(false);
                                        setNewTest({ title: '', description: '', time_limit: 30 });
                                    }}
                                    className="flex-1 py-3 text-slate-600 font-bold bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
                                >
                                    취소
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 py-3 text-white font-bold bg-slate-900 hover:bg-slate-800 rounded-xl transition-colors"
                                >
                                    생성하기
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Edit Modal */}
            {editingTest && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200">
                        <div className="p-6 border-b">
                            <h2 className="text-xl font-bold text-slate-900">검사 정보 수정</h2>
                        </div>
                        <form onSubmit={handleUpdate} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-black mb-1">검사명 <span className="text-red-500">*</span></label>
                                <input
                                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg text-black placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-black"
                                    placeholder="예: 2024년 인성검사 A형"
                                    value={editingTest.title}
                                    onChange={(e) => setEditingTest({ ...editingTest, title: e.target.value })}
                                    autoFocus
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-black mb-1">설명</label>
                                <textarea
                                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg text-black placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-black resize-none h-24"
                                    placeholder="검사에 대한 간단한 설명을 입력하세요."
                                    value={editingTest.description}
                                    onChange={(e) => setEditingTest({ ...editingTest, description: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-black mb-1">제한 시간 (분)</label>
                                <input
                                    type="number"
                                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg text-black placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-black"
                                    value={editingTest.time_limit ?? ''}
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        setEditingTest({
                                            ...editingTest,
                                            time_limit: val === '' ? null : parseInt(val)
                                        });
                                    }}
                                    min={0}
                                />
                            </div>
                            <div className="flex gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setEditingTest(null)}
                                    className="flex-1 py-3 text-slate-600 font-bold bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
                                >
                                    취소
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 py-3 text-white font-bold bg-slate-900 hover:bg-slate-800 rounded-xl transition-colors"
                                >
                                    수정하기
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
