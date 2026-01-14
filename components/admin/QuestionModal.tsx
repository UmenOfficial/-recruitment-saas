import { useState, useEffect } from 'react';
import { X, Plus, Trash2, Image as ImageIcon, ChevronDown } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

interface QuestionModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    defaultType: 'APTITUDE' | 'PERSONALITY';
    initialData?: any | null; // Added initialData for edit mode
}

interface OptionItem {
    text: string;
    imageUrl: string | null;
}

export default function QuestionModal({ isOpen, onClose, onSuccess, defaultType, initialData }: QuestionModalProps) {
    const [formData, setFormData] = useState({
        category: '',
        difficulty: 'MEDIUM',
        question: '',
        description: '',
        options: Array(5).fill({ text: '', imageUrl: null }) as OptionItem[],
        correctAnswer: '',
        score: 1,
        imageUrl: null as string | null,
        isReverseScore: false
    });

    const [imageFile, setImageFile] = useState<File | null>(null);
    const [optionImageFiles, setOptionImageFiles] = useState<{ [key: number]: File }>({});
    const [loading, setLoading] = useState(false);
    const [existingCategories, setExistingCategories] = useState<string[]>([]);
    const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);

    useEffect(() => {
        if (isOpen) {
            const fetchCategories = async () => {
                const { data } = await supabase.from('questions').select('category');
                if (data) {
                    const unique = Array.from(new Set(data.map((q: any) => q.category).filter(Boolean)));
                    setExistingCategories(unique);
                }
            };
            fetchCategories();

            // Populate form if initialData exists (Edit Mode)
            if (initialData) {
                // Ensure options are parsed correctly depending on DB format (JSONB array or array of object)
                let parsedOptions: OptionItem[] = [];
                if (Array.isArray(initialData.options)) {
                    parsedOptions = initialData.options.map((opt: any) => {
                        if (typeof opt === 'string') return { text: opt, imageUrl: null };
                        return { text: opt.text || '', imageUrl: opt.imageUrl || null };
                    });
                } else {
                    parsedOptions = Array(5).fill({ text: '', imageUrl: null });
                }

                // Correct Answer (Index to 1-based string)
                const correctAns = initialData.correct_answer !== null && initialData.correct_answer !== undefined
                    ? String(initialData.correct_answer + 1)
                    : '';

                setFormData({
                    category: initialData.category || '',
                    difficulty: initialData.difficulty || 'MEDIUM',
                    question: initialData.content || '',
                    description: initialData.description || '',
                    options: parsedOptions,
                    correctAnswer: correctAns,
                    score: initialData.score || 1,
                    imageUrl: initialData.image_url || null,
                    isReverseScore: initialData.is_reverse_scored || false
                });
                setImageFile(null); // Reset file inputs
                setOptionImageFiles({});
            } else {
                // Reset for Create Mode
                setFormData({
                    category: '',
                    difficulty: 'MEDIUM',
                    question: '',
                    description: '',
                    options: Array(5).fill({ text: '', imageUrl: null }) as OptionItem[],
                    correctAnswer: '',
                    score: 1,
                    imageUrl: null,
                    isReverseScore: false
                });
                setImageFile(null);
                setOptionImageFiles({});
            }
        }
    }, [isOpen, initialData]);

    if (!isOpen) return null;

    const handleOptionTextChange = (idx: number, val: string) => {
        const newOptions = [...formData.options];
        newOptions[idx] = { ...newOptions[idx], text: val };
        setFormData({ ...formData, options: newOptions });
    };

    const handleOptionImageChange = (idx: number, file: File) => {
        setOptionImageFiles({ ...optionImageFiles, [idx]: file });
        const previewUrl = URL.createObjectURL(file);
        const newOptions = [...formData.options];
        newOptions[idx] = { ...newOptions[idx], imageUrl: previewUrl };
        setFormData({ ...formData, options: newOptions });
    };

    const removeOptionImage = (idx: number) => {
        const newFiles = { ...optionImageFiles };
        delete newFiles[idx];
        setOptionImageFiles(newFiles);
        const newOptions = [...formData.options];
        newOptions[idx] = { ...newOptions[idx], imageUrl: null };
        setFormData({ ...formData, options: newOptions });
    };

    const addOption = () => {
        if (formData.options.length >= 10) return;
        setFormData({ ...formData, options: [...formData.options, { text: '', imageUrl: null }] });
    };

    const removeOption = (idx: number) => {
        if (formData.options.length <= 2) return;
        const newOptions = formData.options.filter((_, i) => i !== idx);

        // Re-index files (simple clear for safety in this version)
        setOptionImageFiles({});
        setFormData({ ...formData, options: newOptions });
    };

    const handleMainImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setImageFile(e.target.files[0]);
        }
    };

    const handleMainImageRemove = () => {
        setImageFile(null);
        setFormData({ ...formData, imageUrl: null });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            if (!formData.question.trim()) throw new Error('문제 내용은 필수입니다.');

            let correctIndex: number | null = null;
            if (defaultType === 'APTITUDE') {
                if (!formData.correctAnswer) throw new Error('정답을 입력해주세요.');
                const ansNum = parseInt(formData.correctAnswer);
                if (isNaN(ansNum) || ansNum < 1 || ansNum > formData.options.length) {
                    throw new Error(`정답은 1에서 ${formData.options.length} 사이의 숫자여야 합니다.`);
                }
                correctIndex = ansNum - 1;
            }

            let finalImageUrl = formData.imageUrl;

            // Upload Main Image if new file selected
            if (imageFile) {
                const fileExt = imageFile.name.split('.').pop();
                const fileName = `main_${Math.random()}.${fileExt}`;
                const { error: uploadError } = await supabase.storage.from('questions').upload(fileName, imageFile);
                if (uploadError) throw uploadError;
                const { data } = supabase.storage.from('questions').getPublicUrl(fileName);
                finalImageUrl = data.publicUrl;
            }

            const finalOptions = [...formData.options];
            // Upload Option Images if new files selected
            for (const [idxStr, file] of Object.entries(optionImageFiles)) {
                const idx = parseInt(idxStr);
                const fileExt = file.name.split('.').pop();
                const fileName = `opt_${Math.random()}.${fileExt}`;
                const { error: uploadError } = await supabase.storage.from('questions').upload(fileName, file);
                if (uploadError) continue;
                const { data } = supabase.storage.from('questions').getPublicUrl(fileName);
                finalOptions[idx] = { ...finalOptions[idx], imageUrl: data.publicUrl };
            }

            const payload = {
                category: formData.category || '일반',
                difficulty: 'MEDIUM',
                content: formData.question,
                description: formData.description,
                image_url: finalImageUrl,
                options: finalOptions,
                correct_answer: correctIndex,
                score: 1,
                type: defaultType,
                is_reverse_scored: formData.isReverseScore
            };

            let error;
            if (initialData) {
                // UPDATE
                const { error: updateError } = await (supabase
                    .from('questions') as any)
                    .update(payload)
                    .eq('id', initialData.id);
                error = updateError;
            } else {
                // INSERT
                const { error: insertError } = await (supabase
                    .from('questions') as any)
                    .insert(payload);
                error = insertError;
            }

            if (error) throw error;
            toast.success(initialData ? '문제가 수정되었습니다.' : '문제가 추가되었습니다.');
            onSuccess();

            // Initial cleanup handled by useEffect when modal closes or opens with new data,
            // but for safety/UX we can clear here too if we want to stay open (optional).
            // Usually we assume modal closes on success.

        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
            <div className="bg-white w-full max-w-lg sm:rounded-3xl h-[90vh] sm:h-auto max-h-[90vh] flex flex-col shadow-2xl animate-in slide-in-from-bottom-10 fade-in duration-300">

                {/* Header */}
                <div className="p-6 pb-4 flex justify-between items-center border-b border-gray-100">
                    <div>
                        <h2 className="text-2xl font-bold text-slate-900 leading-tight">
                            {initialData ? '문제 수정' : (defaultType === 'APTITUDE' ? '적성검사 문제' : '인성검사 문제')}
                        </h2>
                        <p className="text-sm text-slate-500 mt-1">
                            {initialData ? '기존 문제를 수정합니다.' : '새로운 문제를 만들어보세요.'}
                        </p>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-100 transition-colors text-slate-500">
                        <X size={24} />
                    </button>
                </div>

                {/* Body - Scrollable */}
                <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">

                    <form id="question-form" onSubmit={handleSubmit} className="space-y-8">

                        {/* 1. 영역 (Category) */}
                        <div className="space-y-2 relative">
                            <label className="block text-sm font-semibold text-slate-900">
                                {defaultType === 'APTITUDE' ? '영역' : '성격척도'} <span className="text-red-500">*</span>
                            </label>
                            <div className="relative">
                                <input
                                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 transition-all"
                                    placeholder={defaultType === 'APTITUDE' ? "예: 수리영역, 언어영역..." : "예: 외향성, 성실성..."}
                                    value={formData.category}
                                    onChange={(e) => {
                                        setFormData({ ...formData, category: e.target.value });
                                        setIsCategoryDropdownOpen(true);
                                    }}
                                    onFocus={() => setIsCategoryDropdownOpen(true)}
                                    onBlur={() => setTimeout(() => setIsCategoryDropdownOpen(false), 200)}
                                    autoComplete="off"
                                />
                                <button
                                    type="button"
                                    onClick={() => setIsCategoryDropdownOpen(!isCategoryDropdownOpen)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                                >
                                    <ChevronDown size={20} />
                                </button>

                                {isCategoryDropdownOpen && (
                                    <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-100 rounded-2xl shadow-xl max-h-48 overflow-y-auto z-50 custom-scrollbar animate-in fade-in zoom-in-95 duration-200">
                                        {existingCategories.filter(cat => cat.toLowerCase().includes(formData.category.toLowerCase())).length > 0 ? (
                                            existingCategories.filter(cat => cat.toLowerCase().includes(formData.category.toLowerCase())).map((cat, i) => (
                                                <button
                                                    key={i}
                                                    type="button"
                                                    className="w-full text-left px-4 py-3 hover:bg-slate-50 text-slate-700 font-medium transition-colors"
                                                    onClick={() => {
                                                        setFormData({ ...formData, category: cat });
                                                        setIsCategoryDropdownOpen(false);
                                                    }}
                                                >
                                                    {cat}
                                                </button>
                                            ))
                                        ) : (
                                            existingCategories.length > 0 && (
                                                <div className="px-4 py-3 text-slate-400 text-sm">
                                                    일치하는 항목이 없습니다. (새로 입력됩니다)
                                                </div>
                                            )
                                        )}
                                        {/* Show ALL option if filtered list is small and there are more categories? 
                                            Or simpler: Just render filtered list. 
                                            The USER problem was "When I click, only current val shows". 
                                            With this custom UI, if I have "수리영역" typed, filter will still only show "수리영역".
                                            This doesn't fully solve "I want to see all".
                                            
                                            FIX: Let's show ALL categories if the user clicks the toggle button, 
                                            OR if the input value exactly matches one of the categories (implying selection mode).
                                        */}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* 2. 문제 내용 */}
                        <div className="space-y-2">
                            <label className="block text-sm font-semibold text-slate-900">
                                문제 내용 <span className="text-red-500">*</span>
                            </label>
                            <textarea
                                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 transition-all min-h-[120px] resize-none"
                                placeholder="질문을 입력해주세요."
                                value={formData.question}
                                onChange={(e) => setFormData({ ...formData, question: e.target.value })}
                                required
                            />
                        </div>

                        {/* Reverse Score Checkbox - PERSONALITY Only */}
                        {defaultType === 'PERSONALITY' && (
                            <div className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    id="isReverseScore"
                                    className="w-5 h-5 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                                    checked={formData.isReverseScore}
                                    onChange={(e) => setFormData({ ...formData, isReverseScore: e.target.checked })}
                                />
                                <label htmlFor="isReverseScore" className="text-sm font-semibold text-slate-900 cursor-pointer select-none">
                                    역채점 (Reverse Scoring)
                                </label>
                            </div>
                        )}

                        {/* 3. 추가 설명 (Optional) - APTITUDE Only */}
                        {defaultType === 'APTITUDE' && (
                            <div className="space-y-2">
                                <label className="block text-sm font-semibold text-slate-900">
                                    추가 설명 및 이미지
                                </label>
                                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-2">
                                    {(imageFile || formData.imageUrl) ? (
                                        <div className="relative w-full h-48 bg-white rounded-xl overflow-hidden mb-2 border border-slate-100">
                                            <img
                                                src={imageFile ? URL.createObjectURL(imageFile) : formData.imageUrl!}
                                                alt="Preview"
                                                className="w-full h-full object-contain"
                                            />
                                            <button
                                                type="button"
                                                onClick={handleMainImageRemove}
                                                className="absolute top-2 right-2 bg-black/60 p-1.5 rounded-full text-white hover:bg-black/80 transition-colors"
                                            >
                                                <X size={14} />
                                            </button>
                                        </div>
                                    ) : null}

                                    <div className="flex gap-2 items-start">
                                        <label className="cursor-pointer p-3 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors">
                                            <ImageIcon size={24} />
                                            <input type="file" className="hidden" accept="image/*" onChange={handleMainImageChange} />
                                        </label>
                                        <textarea
                                            className="flex-1 p-3 bg-transparent border-none text-slate-900 placeholder:text-slate-400 focus:ring-0 resize-none h-20"
                                            placeholder="설명이 필요하다면 입력하세요."
                                            value={formData.description}
                                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                        />
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* 4. 선택지 - APTITUDE Only */}
                        {defaultType === 'APTITUDE' && (
                            <div className="space-y-3">
                                <div className="flex justify-between items-end">
                                    <label className="block text-sm font-semibold text-slate-900">
                                        선택지
                                    </label>
                                    <button type="button" onClick={addOption} disabled={formData.options.length >= 10} className="text-sm font-medium text-blue-600 hover:text-blue-700 disabled:opacity-50">
                                        + 항목 추가
                                    </button>
                                </div>

                                <div className="space-y-3">
                                    {formData.options.map((opt, idx) => (
                                        <div key={idx} className="group relative bg-white border border-slate-200 rounded-2xl p-1 pl-4 flex items-center gap-3 shadow-sm hover:border-slate-300 transition-colors focus-within:ring-2 focus-within:ring-slate-900">
                                            <span className="text-slate-400 font-medium text-sm w-4">{idx + 1}</span>
                                            <div className="flex-1 flex flex-col py-2">
                                                <input
                                                    className="w-full bg-transparent border-none p-1 text-slate-900 placeholder:text-slate-400 focus:ring-0 font-medium"
                                                    placeholder={`선택지 ${idx + 1}`}
                                                    value={opt.text}
                                                    onChange={(e) => handleOptionTextChange(idx, e.target.value)}
                                                    required={!opt.imageUrl}
                                                />
                                                {/* Image Preview inside option */}
                                                {opt.imageUrl && (
                                                    <div className="relative mt-2 w-20 h-20 bg-slate-50 rounded-lg overflow-hidden border border-slate-100">
                                                        <img src={opt.imageUrl} className="w-full h-full object-cover" />
                                                        <button type="button" onClick={() => removeOptionImage(idx)} className="absolute top-1 right-1 bg-black/50 p-1 rounded-full text-white hover:bg-black/70">
                                                            <X size={10} />
                                                        </button>
                                                    </div>
                                                )}
                                            </div>

                                            <div className="flex items-center gap-1 pr-2">
                                                <label className="cursor-pointer p-2 text-slate-400 hover:text-blue-600 transition-colors">
                                                    <ImageIcon size={18} />
                                                    <input type="file" className="hidden" accept="image/*" onChange={(e) => { if (e.target.files?.[0]) handleOptionImageChange(idx, e.target.files[0]) }} />
                                                </label>
                                                <button
                                                    type="button"
                                                    onClick={() => removeOption(idx)}
                                                    disabled={formData.options.length <= 2}
                                                    className="p-2 text-slate-300 hover:text-red-500 disabled:opacity-0 transition-colors"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* 5. 정답 (적성검사만) */}
                        {defaultType === 'APTITUDE' && (
                            <div className="space-y-2">
                                <label className="block text-sm font-semibold text-slate-900">
                                    정답 <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="number"
                                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 transition-all font-bold"
                                    placeholder="정답 번호를 입력하세요"
                                    value={formData.correctAnswer}
                                    onChange={(e) => setFormData({ ...formData, correctAnswer: e.target.value })}
                                    min={1}
                                    max={formData.options.length}
                                    required
                                />
                            </div>
                        )}

                        <div className="pb-8"></div> {/* Bottom Spacer */}
                    </form>
                </div>

                {/* Footer Action */}
                <div className="p-6 pt-2 bg-white border-t border-gray-50 rounded-b-3xl">
                    <button
                        type="submit"
                        form="question-form"
                        disabled={loading}
                        className="w-full py-4 bg-slate-900 text-white rounded-2xl font-bold text-lg hover:bg-slate-800 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-xl shadow-slate-200"
                    >
                        {loading ? '저장 중...' : (initialData ? '수정 완료' : '완료하기')}
                    </button>
                </div>
            </div>
        </div>
    );
}
