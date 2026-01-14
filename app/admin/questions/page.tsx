'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Plus, Trash2, Search, FileText, FileSpreadsheet } from 'lucide-react';
import ExcelUpload from '@/components/admin/ExcelUpload';
import QuestionModal from '@/components/admin/QuestionModal';
import { Toaster, toast } from 'sonner';

/**
 * 문제 관리 페이지
 * 
 * 개별 문제에 대한 CRUD 기능과 엑셀 대량 업로드 기능을 제공합니다.
 * 탭을 통해 '목록 보기'와 '대량 업로드' 모드를 전환합니다.
 */
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

import { useRouter, useSearchParams } from 'next/navigation';

import { Info } from 'lucide-react'; // Import Info icon for usage check

// ... (existing imports match file content, ensure Info is imported)
// NOTE: I will replace the imports line completely to include Info.

export default function QuestionsPage() {
    const router = useRouter();
    const searchParams = useSearchParams();

    // Initial State derived from URL or default
    const getInitialTab = () => {
        const tab = searchParams.get('tab');
        if (tab === 'APTITUDE' || tab === 'PERSONALITY') return tab;
        return 'DASHBOARD';
    };

    const [activeTab, setActiveTabState] = useState<'DASHBOARD' | 'APTITUDE' | 'PERSONALITY'>(getInitialTab());
    const [questions, setQuestions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isQuestionModalOpen, setIsQuestionModalOpen] = useState(false);
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

    const [selectedQuestion, setSelectedQuestion] = useState<any | null>(null);

    // Filter & Search States
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string>('All');

    // Usage Check State
    const [usageModalOpen, setUsageModalOpen] = useState(false);
    const [checkingUsageId, setCheckingUsageId] = useState<string | null>(null);

    // Sync state when URL changes (e.g. back button or sidebar click)
    useEffect(() => {
        const tab = searchParams.get('tab');
        if (tab === 'APTITUDE' || tab === 'PERSONALITY') {
            setActiveTabState(tab);
            setSelectedCategory('All'); // Reset filter on tab change
            setSearchTerm('');
        } else {
            // If no tab in URL, ensure default is DASHBOARD
            setActiveTabState('DASHBOARD');
        }
    }, [searchParams]);

    // Wrapper to update both State and URL
    const setActiveTab = (tab: 'DASHBOARD' | 'APTITUDE' | 'PERSONALITY') => {
        setActiveTabState(tab);
        router.push(tab === 'DASHBOARD' ? '/admin/questions' : `/admin/questions?tab=${tab}`);
    };

    const fetchQuestions = async () => {
        setLoading(true);
        const { data } = await supabase.from('questions').select('*').order('created_at', { ascending: false });
        setQuestions(data || []);
        setLoading(false);
    };

    useEffect(() => {
        fetchQuestions();
    }, []);

    const handleDelete = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation(); // Prevent row click
        if (!confirm('정말 삭제하시겠습니까?')) return;

        await (supabase.from('questions') as any).delete().eq('id', id);
        toast.success('삭제되었습니다.');
        setQuestions(questions.filter(q => q.id !== id));
    };

    const handleRowClick = (q: any) => {
        setSelectedQuestion(q);
        setIsQuestionModalOpen(true);
    };

    const navToCreate = () => {
        setSelectedQuestion(null);
        setIsQuestionModalOpen(true);
    };

    // Filter Logic
    const baseQuestions = questions.filter(q => {
        const qType = q.type || 'APTITUDE';
        return qType === activeTab;
    });

    // Get Unique Categories for the Dropdown
    const uniqueCategories = Array.from(new Set(baseQuestions.map(q => q.category).filter(Boolean)));

    const filteredQuestions = baseQuestions.filter(q => {
        // 1. Category Filter
        if (selectedCategory !== 'All' && q.category !== selectedCategory) return false;

        // 2. Search Filter (Content or Description)
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            const contentMatch = q.content?.toLowerCase().includes(term);
            // Check description if it exists (legacy type safety ignored here as runtime check)
            const descMatch = (q as any).description?.toLowerCase().includes(term);
            return contentMatch || descMatch;
        }
        return true;
    });

    // Placeholder Usage Handler
    const handleCheckUsage = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        setCheckingUsageId(id);
        setUsageModalOpen(true);
    }

    return (
        <div className="space-y-6">
            <Toaster position="top-right" />

            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">
                        {activeTab === 'DASHBOARD' ? '문항 관리 대시보드' :
                            activeTab === 'APTITUDE' ? '적성검사 문제 관리' : '인성검사 문제 관리'}
                    </h1>
                    <p className="text-slate-500">
                        {activeTab === 'DASHBOARD' ? '등록된 모든 문항의 통계와 현황을 확인합니다.' :
                            activeTab === 'APTITUDE' ? '지원자의 직무 능력을 평가하는 적성검사 문제입니다.' : '지원자의 성향을 파악하는 인성검사 문제입니다.'}
                    </p>
                </div>
            </div>

            {/* Dashboard View */}
            {activeTab === 'DASHBOARD' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Aptitude Stats */}
                    <div className="bg-white p-6 rounded-xl border shadow-sm">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                <span className="w-2 h-6 bg-blue-500 rounded-sm"></span>
                                적성검사 현황
                            </h3>
                            <button
                                onClick={() => setActiveTab('APTITUDE')}
                                className="text-sm text-blue-600 hover:underline font-medium"
                            >
                                관리하기 →
                            </button>
                        </div>
                        <div className="space-y-4">
                            {Object.entries(
                                questions
                                    .filter(q => (q.type || 'APTITUDE') === 'APTITUDE')
                                    .reduce((acc: any, q) => {
                                        const cat = q.category || '미분류';
                                        acc[cat] = (acc[cat] || 0) + 1;
                                        return acc;
                                    }, {})
                            ).map(([cat, count]: any) => (
                                <div key={cat} className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                                    <span className="text-slate-700 font-medium">{cat}</span>
                                    <span className="text-lg font-bold text-blue-600">{count}문항</span>
                                </div>
                            ))}
                            {questions.filter(q => (q.type || 'APTITUDE') === 'APTITUDE').length === 0 && (
                                <p className="text-center text-slate-400 py-4">등록된 문항이 없습니다.</p>
                            )}
                        </div>
                    </div>

                    {/* Personality Stats */}
                    <div className="bg-white p-6 rounded-xl border shadow-sm">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                <span className="w-2 h-6 bg-indigo-500 rounded-sm"></span>
                                인성검사 현황
                            </h3>
                            <button
                                onClick={() => setActiveTab('PERSONALITY')}
                                className="text-sm text-indigo-600 hover:underline font-medium"
                            >
                                관리하기 →
                            </button>
                        </div>
                        <div className="space-y-4">
                            {Object.entries(
                                questions
                                    .filter(q => q.type === 'PERSONALITY')
                                    .reduce((acc: any, q) => {
                                        const cat = q.category || '미분류';
                                        acc[cat] = (acc[cat] || 0) + 1;
                                        return acc;
                                    }, {})
                            ).map(([cat, count]: any) => (
                                <div key={cat} className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                                    <span className="text-slate-700 font-medium">{cat}</span>
                                    <span className="text-lg font-bold text-indigo-600">{count}문항</span>
                                </div>
                            ))}
                            {questions.filter(q => q.type === 'PERSONALITY').length === 0 && (
                                <p className="text-center text-slate-400 py-4">등록된 문항이 없습니다.</p>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* List View */}
            {activeTab !== 'DASHBOARD' && (
                <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
                    {/* 검색 / 필터 */}
                    <div className="p-4 border-b flex gap-4 flex-wrap">
                        {/* Category Filter */}
                        <div className="w-40 relative">
                            <select
                                className="w-full p-2.5 bg-slate-50 border rounded-lg text-sm text-slate-700 outline-none focus:ring-2 focus:ring-blue-100 appearance-none"
                                value={selectedCategory}
                                onChange={(e) => setSelectedCategory(e.target.value)}
                            >
                                <option value="All">전체 영역</option>
                                {uniqueCategories.map((cat, i) => (
                                    <option key={i} value={cat}>{cat}</option>
                                ))}
                            </select>
                            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                                <svg width="10" height="6" viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                            </div>
                        </div>

                        <div className="relative flex-1 min-w-[200px]">
                            <Search className="absolute left-3 top-2.5 text-slate-400" size={18} />
                            <input
                                className="w-full pl-10 pr-4 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-100"
                                placeholder="문제 내용 검색..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>

                        <button
                            onClick={() => setIsUploadModalOpen(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-white border text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 whitespace-nowrap"
                        >
                            <FileSpreadsheet size={16} /> 엑셀로 업로드
                        </button>
                        <button
                            onClick={navToCreate}
                            className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800 whitespace-nowrap"
                        >
                            <Plus size={16} /> 새 문제 추가
                        </button>
                    </div>

                    <QuestionModal
                        isOpen={isQuestionModalOpen}
                        onClose={() => setIsQuestionModalOpen(false)}
                        defaultType={activeTab} // Pass current tab as default type
                        initialData={selectedQuestion} // Pass selected question (can be null)
                        onSuccess={() => {
                            fetchQuestions();
                            setIsQuestionModalOpen(false);
                        }}
                    />

                    {/* Excel Upload Modal */}
                    <Dialog open={isUploadModalOpen} onOpenChange={setIsUploadModalOpen}>
                        <DialogContent className="max-w-2xl">
                            <DialogHeader>
                                <DialogTitle className="text-black">엑셀 대량 업로드 ({activeTab === 'APTITUDE' ? '적성검사' : '인성검사'})</DialogTitle>
                            </DialogHeader>
                            <ExcelUpload
                                defaultType={activeTab}
                                onSuccess={() => {
                                    fetchQuestions();
                                    setIsUploadModalOpen(false);
                                }}
                            />
                        </DialogContent>
                    </Dialog>

                    {/* Usage Check Modal (Placeholder) */}
                    <Dialog open={usageModalOpen} onOpenChange={setUsageModalOpen}>
                        <DialogContent className="max-w-md">
                            <DialogHeader>
                                <DialogTitle>문제 사용 현황</DialogTitle>
                            </DialogHeader>
                            <div className="p-4 bg-slate-50 rounded-lg text-sm text-slate-600">
                                <p className="mb-2 font-semibold">🔍 포함된 검사 목록</p>
                                <p className="text-slate-400 italic">아직 생성된 검사가 없습니다.</p>
                                <p className="text-xs text-slate-400 mt-4 border-t pt-2">
                                    * 추후 검사 관리 기능이 추가되면, 이 문제가 어떤 검사의 몇 번째 문항으로 출제되었는지 확인할 수 있습니다.
                                </p>
                            </div>
                        </DialogContent>
                    </Dialog>

                    {loading ? (
                        <div className="p-12 text-center text-slate-400">로딩 중...</div>
                    ) : filteredQuestions.length === 0 ? (
                        <div className="p-12 text-center text-slate-400 flex flex-col items-center">
                            <FileText size={48} className="mb-4 opacity-20" />
                            <p>
                                {searchTerm ? '검색 결과가 없습니다.' : `등록된 ${activeTab === 'APTITUDE' ? '적성검사' : '인성검사'} 문제가 없습니다.`}
                            </p>
                        </div>
                    ) : (
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-50 text-slate-500 font-medium">
                                <tr>
                                    <th className="p-4 pl-6 w-32">카테고리</th>

                                    <th className="p-4 w-1/2">질문</th>
                                    <th className="p-4 text-right pr-6 w-32">관리</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y text-slate-700">
                                {filteredQuestions.map(q => (
                                    <tr key={q.id} className="hover:bg-slate-50 cursor-pointer" onClick={() => handleRowClick(q)}>
                                        <td className="p-4 pl-6">
                                            <span className="px-2 py-1 bg-slate-100 rounded text-xs font-semibold">{q.category}</span>
                                        </td>

                                        <td className="p-4 truncate max-w-md" title={q.content?.question || ''}>
                                            {q.content?.question || q.content || '(질문 내용 없음)'}
                                        </td>
                                        <td className="p-4 text-right pr-6">
                                            <div className="flex items-center justify-end gap-1">
                                                <button
                                                    onClick={(e) => handleCheckUsage(e, q.id)}
                                                    className="text-slate-400 hover:text-blue-600 p-2 hover:bg-blue-50 rounded-full transition-colors z-10 relative"
                                                    title="사용 현황 확인"
                                                >
                                                    <Info size={18} />
                                                </button>
                                                <button
                                                    onClick={(e) => handleDelete(e, q.id)}
                                                    className="text-slate-400 hover:text-red-600 p-2 hover:bg-red-50 rounded-full transition-colors z-10 relative"
                                                    title="삭제"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}

                </div>
            )}
        </div>
    );
}
