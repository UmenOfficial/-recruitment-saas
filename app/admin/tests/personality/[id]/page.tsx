'use client';

import { useState, useEffect, use } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Search, Plus, Trash2, Save, GripVertical, Shuffle, Upload, Image as ImageIcon } from 'lucide-react';
import { toast } from 'sonner';

interface PageProps {
    params: Promise<{ id: string }>;
}

export default function PersonalityTestBuilder({ params }: PageProps) {
    const { id } = use(params);
    const router = useRouter();

    const [test, setTest] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    // Left: Available Questions
    const [availableQuestions, setAvailableQuestions] = useState<any[]>([]);
    const [filteredQuestions, setFilteredQuestions] = useState<any[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('ALL');

    // Right: Test Questions (Added)
    const [testQuestions, setTestQuestions] = useState<any[]>([]);

    // Settings
    const [isRandom, setIsRandom] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isUploading, setIsUploading] = useState(false);

    // Drag & Drop State
    const [draggedIdx, setDraggedIdx] = useState<number | null>(null);

    // Detail Modal State
    const [selectedQuestion, setSelectedQuestion] = useState<any>(null);

    useEffect(() => {
        // Reset state immediately when ID changes to prevent stale data
        setTest(null);
        setTestQuestions([]);
        setAvailableQuestions([]);
        setFilteredQuestions([]);
        fetchData();
    }, [id]);

    useEffect(() => {
        filterAvailable();
    }, [availableQuestions, searchQuery, selectedCategory]);

    const fetchData = async () => {
        try {
            setLoading(true);

            // 1. Fetch Test Details
            const { data: testData, error: testError } = await supabase
                .from('tests')
                .select('*')
                .eq('id', id)
                .single();
            if (testError) throw testError;
            setTest(testData);
            setIsRandom((testData as any).is_random || false);

            // 2. Fetch All Personality Questions
            const { data: allQuestions, error: qError } = await supabase
                .from('questions')
                .select('*')
                .eq('type', 'PERSONALITY')
                .order('created_at', { ascending: false });
            if (qError) throw qError;

            // 3. Fetch Already Added Questions (with existing order)
            const { data: existingRelations, error: rError } = await supabase
                .from('test_questions')
                .select('question_id, order_index, questions(*)')
                .eq('test_id', id)
                .order('order_index', { ascending: true });
            if (rError) throw rError;

            // Separate Added vs Available
            const addedIds = new Set(existingRelations.map((r: any) => r.question_id));

            const addedList = existingRelations.map((r: any) => ({
                ...r.questions,
                order_index: r.order_index // Keep relation's order
            }));

            setTestQuestions(addedList);
            setAvailableQuestions(allQuestions.filter((q: any) => !addedIds.has(q.id)));

        } catch (error: any) {
            console.error(error);
            toast.error('데이터를 불러오는데 실패했습니다.');
            router.push('/admin/tests/personality');
        } finally {
            setLoading(false);
        }
    };

    const filterAvailable = () => {
        let filtered = availableQuestions;
        if (searchQuery) {
            const lowQuery = searchQuery.toLowerCase();
            filtered = filtered.filter(q =>
                q.content.toLowerCase().includes(lowQuery) ||
                q.category?.toLowerCase().includes(lowQuery)
            );
        }
        if (selectedCategory !== 'ALL') {
            filtered = filtered.filter(q => q.category === selectedCategory);
        }
        setFilteredQuestions(filtered);
    };

    const addQuestion = (question: any) => {
        // Move from Available to Test Questions
        const newEntry = { ...question, order_index: testQuestions.length };
        setTestQuestions([...testQuestions, newEntry]);
        setAvailableQuestions(availableQuestions.filter(q => q.id !== question.id));
    };

    const removeQuestion = (question: any) => {
        // Move from Test Questions to Available
        setTestQuestions(testQuestions.filter(q => q.id !== question.id));
        setAvailableQuestions([question, ...availableQuestions]);
    };

    // Drag Handlers (Enable only if NOT random)
    const handleDragStart = (e: React.DragEvent, index: number) => {
        if (isRandom) return; // Disable drag if random is on
        setDraggedIdx(index);
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragOver = (e: React.DragEvent, index: number) => {
        e.preventDefault();
        if (isRandom || draggedIdx === null || draggedIdx === index) return;
        moveItem(draggedIdx, index);
        setDraggedIdx(index);
    };

    const dropItem = (e: React.DragEvent) => {
        e.preventDefault();
        setDraggedIdx(null);
    };

    const addAllQuestions = () => {
        if (filteredQuestions.length === 0) return;

        // Add all currently filtered questions
        const newEntries = filteredQuestions.map((q, idx) => ({
            ...q,
            order_index: testQuestions.length + idx
        }));

        setTestQuestions([...testQuestions, ...newEntries]);

        // Remove from available
        const addedIds = new Set(filteredQuestions.map(q => q.id));
        setAvailableQuestions(availableQuestions.filter(q => !addedIds.has(q.id)));
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `${id}-${Date.now()}.${fileExt}`;
            const filePath = `covers/${fileName}`;

            // 1. Upload to Storage (Use existing 'questions' bucket)
            const { error: uploadError } = await supabase.storage
                .from('questions')
                .upload(filePath, file, { upsert: true });

            if (uploadError) throw uploadError;

            // 2. Get Public URL
            const { data: { publicUrl } } = supabase.storage
                .from('questions')
                .getPublicUrl(filePath);

            // 3. Update DB
            // Fix: Cast update payload
            const { error: dbError } = await (supabase
                .from('tests') as any)
                .update({ image_url: publicUrl })
                .eq('id', id);

            if (dbError) throw dbError;

            // 4. Update Local State
            setTest((prev: any) => ({ ...prev, image_url: publicUrl }));
            toast.success('대표 이미지가 변경되었습니다.');

        } catch (error: any) {
            console.error('Image upload failed:', error);
            console.error('Error details:', JSON.stringify(error, null, 2));
            toast.error(`이미지 업로드 실패: ${error.message || '알 수 없는 오류'}`);
        } finally {
            setIsUploading(false);
            // Reset input to allow selecting the same file again
            e.target.value = '';
        }
    };

    const moveItem = (fromIdx: number, toIdx: number) => {
        if (fromIdx === toIdx) return;
        setTestQuestions(prev => {
            const newList = [...prev];
            const item = newList[fromIdx];
            newList.splice(fromIdx, 1);
            newList.splice(toIdx, 0, item);
            return newList;
        });
    };

    const handleSave = async () => {
        if (!test) return;
        setIsSaving(true);
        try {
            // 1. Update Test Settings (is_random)
            // Fix: Cast update payload
            const { error: updateError } = await (supabase
                .from('tests') as any)
                .update({ is_random: isRandom })
                .eq('id', test.id);
            if (updateError) throw updateError;

            // 2. Delete all existing relations for this test
            // (Efficient enough for typical test sizes, avoids complex upsert logic for reordering)
            const { error: delError } = await supabase
                .from('test_questions')
                .delete()
                .eq('test_id', test.id);
            if (delError) throw delError;

            // 3. Insert new relations with updated order
            if (testQuestions.length > 0) {
                const payload = testQuestions.map((q, idx) => ({
                    test_id: test.id,
                    question_id: q.id,
                    order_index: idx
                }));

                // Fix: Cast insert payload
                const { error: insError } = await (supabase
                    .from('test_questions') as any)
                    .insert(payload);
                if (insError) throw insError;
            }

            toast.success('검사지 구성이 저장되었습니다.');
            fetchData();

        } catch (error: any) {
            console.error(error);
            toast.error('저장에 실패했습니다.');
        } finally {
            setIsSaving(false);
        }
    };

    if (loading) return <div className="p-12 text-center text-slate-400">Loading...</div>;
    if (!test) return null;

    const categories = Array.from(new Set(availableQuestions.map(q => q.category).filter(Boolean)));

    return (
        <div className="h-[calc(100vh-140px)] flex flex-col">
            {/* Header */}
            <div className="flex justify-between items-center mb-6 shrink-0">
                <div className="flex items-center gap-4">
                    <button onClick={() => router.back()} className="p-2 hover:bg-slate-100 rounded-full text-slate-500">
                        <ChevronLeft size={24} />
                    </button>

                    {/* Cover Image Upload Trigger */}
                    <div className="relative group w-16 h-16 rounded-xl overflow-hidden border border-slate-200 bg-slate-100 shrink-0 cursor-pointer" onClick={() => !isUploading && document.getElementById('cover-upload')?.click()}>
                        {isUploading ? (
                            <div className="w-full h-full flex items-center justify-center bg-slate-50">
                                <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin text-blue-600" />
                            </div>
                        ) : test.image_url ? (
                            <img src={test.image_url} alt="Cover" className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-slate-400">
                                <ImageIcon size={24} />
                            </div>
                        )}

                        {!isUploading && (
                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <Upload size={16} className="text-white" />
                            </div>
                        )}
                        <input
                            id="cover-upload"
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={handleImageUpload}
                            disabled={isUploading}
                        />
                    </div>

                    <div>
                        <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                            {test.title}
                            <span className="text-sm font-normal text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                                {test.status}
                            </span>
                        </h1>
                        <p className="text-slate-500 text-sm">총 {testQuestions.length}문항 선택됨</p>
                    </div>
                </div >

                <div className="flex items-center gap-4">
                    {/* Random Toggle */}
                    <div
                        onClick={() => setIsRandom(!isRandom)}
                        className={`flex items-center gap-3 px-4 py-2 rounded-xl cursor-pointer transition-colors border ${isRandom ? 'bg-indigo-50 border-indigo-200' : 'bg-white border-slate-200 hover:bg-slate-50'}`}
                    >
                        <div className={`p-1.5 rounded-lg ${isRandom ? 'bg-indigo-500 text-white' : 'bg-slate-200 text-slate-500'}`}>
                            <Shuffle size={16} />
                        </div>
                        <div className="flex flex-col">
                            <span className={`text-sm font-bold ${isRandom ? 'text-indigo-700' : 'text-slate-600'}`}>문항 섞기</span>
                            <span className="text-[10px] text-slate-400">응시자에게 무작위 순서로 노출</span>
                        </div>
                        <div className={`w-10 h-6 rounded-full relative transition-colors ml-2 ${isRandom ? 'bg-indigo-500' : 'bg-slate-300'}`}>
                            <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${isRandom ? 'left-5' : 'left-1'}`} />
                        </div>
                    </div>

                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="flex items-center gap-2 px-6 py-2.5 bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition-colors font-bold shadow-lg shadow-slate-200 disabled:opacity-50"
                    >
                        <Save size={18} />
                        {isSaving ? '저장 중...' : '구성 저장하기'}
                    </button>
                </div>
            </div >

            {/* Main Content - Two Panes */}
            < div className="flex-1 flex gap-6 min-h-0" >
                {/* Left Panel: Available Questions */}
                < div className="w-1/2 flex flex-col bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden" >
                    <div className="p-4 border-b bg-slate-50 flex flex-col gap-3">
                        <div className="flex justify-between items-center">
                            <h3 className="font-bold text-black">문항 보관함 ({filteredQuestions.length})</h3>
                            {filteredQuestions.length > 0 && (
                                <button
                                    onClick={addAllQuestions}
                                    className="text-xs font-bold text-blue-600 hover:text-blue-800 hover:bg-blue-50 px-2 py-1 rounded transition-colors"
                                >
                                    모두 선택
                                </button>
                            )}
                        </div>
                        <div className="flex gap-2">
                            <div className="relative flex-1">
                                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input
                                    className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-black placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-black"
                                    placeholder="문항 검색..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>
                            <select
                                className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-black font-medium focus:outline-none focus:ring-2 focus:ring-black"
                                value={selectedCategory}
                                onChange={(e) => setSelectedCategory(e.target.value)}
                            >
                                <option value="ALL">전체 성격척도</option>
                                {categories.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>
                    </div>
                    <div className="flex-1 overflow-y-auto p-2 space-y-2 custom-scrollbar">
                        {filteredQuestions.map(q => (
                            <div key={q.id} className="bg-white p-3 rounded-xl border border-slate-100 hover:border-blue-200 hover:shadow-md transition-all group flex gap-3 items-start">
                                <button
                                    onClick={() => addQuestion(q)}
                                    className="mt-0.5 p-1.5 bg-slate-100 text-slate-400 rounded-lg group-hover:bg-blue-600 group-hover:text-white transition-colors"
                                >
                                    <Plus size={16} />
                                </button>
                                <div className="flex-1">
                                    <div className="text-xs font-bold text-blue-600 mb-0.5">{q.category}</div>
                                    <div className="text-sm text-slate-800 line-clamp-2 font-medium">{q.content}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div >

                {/* Right Panel: Selected Questions */}
                < div className="w-1/2 flex flex-col bg-slate-50 rounded-2xl border border-slate-200/60 overflow-hidden" >
                    <div className="p-4 border-b bg-white flex justify-between items-center">
                        <h3 className="font-bold text-black">
                            구성된 검사지 ({testQuestions.length})
                            {isRandom && <span className="text-indigo-600 text-xs ml-2 bg-indigo-50 px-2 py-0.5 rounded-full">순서 무작위 (Drag 불가)</span>}
                        </h3>
                        {!isRandom && <span className="text-xs font-normal text-slate-500 ml-2">드래그하여 순서 변경</span>}
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
                        {testQuestions.map((q, idx) => (
                            <div
                                key={q.id}
                                draggable={!isRandom}
                                onDragStart={(e) => handleDragStart(e, idx)}
                                onDragOver={(e) => handleDragOver(e, idx)}
                                onDrop={dropItem}
                                onClick={() => setSelectedQuestion(q)}
                                className={`bg-white p-3 rounded-xl shadow-sm border border-slate-200 flex items-center gap-3 group hover:shadow-md transition-all 
                                    ${draggedIdx === idx ? 'opacity-50 ring-2 ring-blue-400' : ''}
                                    ${!isRandom ? 'cursor-move' : ''}
                                `}
                            >
                                <div className={`text-slate-300 ${!isRandom ? 'group-hover:text-slate-500' : 'opacity-30'}`}>
                                    <GripVertical size={20} />
                                </div>
                                <span className="text-xs font-mono font-bold w-5 text-center text-slate-400">
                                    {isRandom ? '?' : idx + 1}
                                </span>

                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-[10px] font-bold rounded">
                                            {q.category}
                                        </span>
                                    </div>
                                    <p className="text-sm font-medium text-black line-clamp-1">
                                        {q.content}
                                    </p>
                                </div>

                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        removeQuestion(q);
                                    }}
                                    className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                >
                                    <Trash2 size={18} />
                                </button>
                            </div>
                        ))}
                    </div>
                </div >
            </div >

            {/* Question Detail Modal (Display Only) */}
            {
                selectedQuestion && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4" onClick={() => setSelectedQuestion(null)}>
                        <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl animate-in zoom-in-95 duration-200 overflow-hidden" onClick={e => e.stopPropagation()}>
                            <div className="p-6 border-b flex justify-between items-start">
                                <div>
                                    <span className="inline-block px-2 py-1 bg-blue-50 text-blue-700 text-xs font-bold rounded mb-2">
                                        {selectedQuestion.category}
                                    </span>
                                    <h3 className="text-lg font-bold text-black">문항 상세 정보</h3>
                                </div>
                                <button onClick={() => setSelectedQuestion(null)} className="text-slate-400 hover:text-black">
                                    <Plus size={24} className="rotate-45" />
                                </button>
                            </div>
                            <div className="p-6 max-h-[70vh] overflow-y-auto">
                                <div className="space-y-6">
                                    <div>
                                        <h4 className="text-sm font-bold text-slate-500 mb-2">질문 내용</h4>
                                        <p className="text-black font-medium leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-100">
                                            {selectedQuestion.content}
                                        </p>
                                    </div>
                                    {selectedQuestion.image_url && (
                                        <div>
                                            <h4 className="text-sm font-bold text-slate-500 mb-2">이미지</h4>
                                            <img src={selectedQuestion.image_url} alt="Problem" className="rounded-xl border border-slate-200 max-h-60 object-contain" />
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="p-4 border-t bg-slate-50 flex justify-end">
                                <button
                                    onClick={() => setSelectedQuestion(null)}
                                    className="px-4 py-2 bg-white border border-slate-200 text-slate-700 font-bold rounded-lg hover:bg-slate-100"
                                >
                                    닫기
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    );
}
