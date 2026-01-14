"use client";

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { ArrowLeft, Save, Loader2, Link as LinkIcon, Trash2, Plus, X } from 'lucide-react';
import Link from 'next/link';
import { toast, Toaster } from 'sonner';

export default function PostingDetailPage() {
    const params = useParams();
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Form States
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [isActive, setIsActive] = useState(true);
    const [imageUrl, setImageUrl] = useState<string | null>(null);
    const [isUploading, setIsUploading] = useState(false);

    // Site Config State
    const [introType, setIntroType] = useState<'TYPE_A' | 'TYPE_B'>('TYPE_A');
    const [questions, setQuestions] = useState<string[]>([]);

    useEffect(() => {
        fetchPosting();
    }, []);

    async function fetchPosting() {
        if (!params?.id) return;

        const { data, error } = await supabase
            .from('postings')
            .select('*')
            .eq('id', params.id as string)
            .single();

        if (error) {
            toast.error('공고를 불러오지 못했습니다.');
            router.push('/admin/postings');
            return;
        }

        if (data) {
            const p = data as any;
            setTitle(p.title);
            setDescription(p.description || '');
            setIsActive(p.is_active);
            setImageUrl(p.image_url || null);

            // Load Site Config
            const config = p.site_config || { intro_type: 'TYPE_A', questions: [] };
            setIntroType(config.intro_type || 'TYPE_A');
            setQuestions(config.questions || []);
            setSelectedTestId(config.test_id || '');
        }
        setLoading(false);
    }

    async function handleSave() {
        if (!title.trim()) {
            toast.error('제목은 필수입니다.');
            return;
        }

        setSaving(true);

        const siteConfig = {
            intro_type: introType,
            questions: questions,
            test_id: selectedTestId
        };

        const { error } = await (supabase.from('postings') as any)
            .update({
                title,
                description,
                is_active: isActive,
                image_url: imageUrl,
                site_config: siteConfig // Save JSONB
            })
            .eq('id', params.id as string);

        if (error) {
            toast.error('저장 실패: ' + error.message);
        } else {
            toast.success('변경사항이 저장되었습니다!');
        }
        setSaving(false);
    }

    async function handleDelete() {
        if (!confirm('정말 이 채용 공고를 삭제하시겠습니까? (이 작업은 되돌릴 수 없습니다)')) return;

        const { error } = await supabase
            .from('postings')
            .delete()
            .eq('id', params.id as string);

        if (error) {
            toast.error('삭제 실패: ' + error.message);
        } else {
            toast.success('공고가 삭제되었습니다.');
            router.push('/admin/postings');
        }
    }

    async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
        if (!e.target.files || e.target.files.length === 0) return;

        setIsUploading(true);
        const file = e.target.files[0];
        const fileExt = file.name.split('.').pop();
        const fileName = `${params.id as string}-${Date.now()}.${fileExt}`;
        const filePath = `${fileName}`;

        const { error: uploadError } = await supabase.storage
            .from('posting-images')
            .upload(filePath, file);

        if (uploadError) {
            toast.error('이미지 업로드 실패: ' + uploadError.message);
            setIsUploading(false);
            return;
        }

        const { data: { publicUrl } } = supabase.storage
            .from('posting-images')
            .getPublicUrl(filePath);

        setImageUrl(publicUrl);
        setIsUploading(false);
        toast.success('이미지가 업로드되었습니다. 저장하기를 눌러 확정하세요.');
    }

    // Questions Logic
    const addQuestion = () => setQuestions([...questions, ""]);
    const removeQuestion = (idx: number) => setQuestions(questions.filter((_, i) => i !== idx));
    const updateQuestion = (idx: number, val: string) => {
        const newQ = [...questions];
        newQ[idx] = val;
        setQuestions(newQ);
    }

    // Exam Config
    const [selectedTestId, setSelectedTestId] = useState<string>('');
    const [activeTests, setActiveTests] = useState<{ id: string, title: string, type: string }[]>([]);

    useEffect(() => {
        fetchActiveTests();
    }, []);

    async function fetchActiveTests() {
        // Fetch only ACTIVE tests
        const { data } = await supabase
            .from('tests')
            .select('id, title, type')
            .eq('status', 'ACTIVE')
            .order('created_at', { ascending: false });

        if (data) {
            setActiveTests(data);
        }
    }

    if (loading) {
        return <div className="p-12 text-center text-slate-500">로딩 중...</div>;
    }

    const candidateLink = `${window.location.origin}/jobs/${params.id}/apply`;

    return (
        <div className="max-w-4xl mx-auto space-y-6 pb-20">
            <Toaster position="top-right" />

            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link href="/admin/postings" className="text-slate-400 hover:text-slate-600 transition-colors">
                        <ArrowLeft size={24} />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900">공고 상세 편집</h1>
                        <p className="text-sm text-slate-500">지원자들에게 보여질 채용 공고 내용을 수정합니다.</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={handleDelete}
                        className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                    >
                        <Trash2 size={16} /> 삭제
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold shadow-md transition-all flex items-center gap-2"
                    >
                        {saving ? <Loader2 className="animate-spin" size={18} /> : <><Save size={18} /> 저장하기</>}
                    </button>
                </div>
            </div>

            {/* Main Editor */}
            <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                <div className="p-8 space-y-8">
                    {/* Status Toggle */}
                    <div className="flex items-center justify-between bg-slate-50 p-4 rounded-lg border">
                        <div>
                            <span className="font-bold text-slate-800 block">공고 상태</span>
                            <span className="text-xs text-slate-500">비활성화 시 지원자가 접근할 수 없습니다.</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <span className={`text-sm font-bold ${isActive ? 'text-green-600' : 'text-slate-400'}`}>
                                {isActive ? '공개 중 (OPEN)' : '비공개 (CLOSED)'}
                            </span>
                            <button
                                onClick={() => setIsActive(!isActive)}
                                className={`w-12 h-6 rounded-full transition-colors relative ${isActive ? 'bg-green-500' : 'bg-slate-300'}`}
                            >
                                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform shadow-sm ${isActive ? 'left-7' : 'left-1'}`} />
                            </button>
                        </div>
                    </div>

                    {/* Title */}
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">공고 제목</label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-black font-medium"
                        />
                    </div>

                    {/* Description (Simple Textarea for now) */}
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">상세 내용 (JD)</label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className="w-full h-64 p-4 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-none text-black leading-relaxed"
                            placeholder="주요 업무, 자격 요건, 우대 사항 등을 입력하세요..."
                        />
                    </div>

                    {/* Image Upload Section */}
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">공고 대표 이미지 (썸네일)</label>
                        <div className="flex items-start gap-4">
                            {imageUrl ? (
                                <div className="relative group w-64 h-40 rounded-lg overflow-hidden border border-slate-200">
                                    <img src={imageUrl} alt="Posting Thumbnail" className="w-full h-full object-cover" />
                                    <button
                                        onClick={() => setImageUrl(null)}
                                        className="absolute top-2 right-2 bg-black/50 hover:bg-red-500 text-white p-1 rounded-full transition-colors opacity-0 group-hover:opacity-100"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            ) : (
                                <div className="w-64 h-40 rounded-lg border-2 border-dashed border-slate-300 flex flex-col items-center justify-center bg-slate-50 text-slate-400 gap-2">
                                    <Loader2 size={24} className={isUploading ? "animate-spin" : "hidden"} />
                                    {!isUploading && <span>이미지 없음</span>}
                                </div>
                            )}

                            <div className="flex flex-col gap-2">
                                <label className="px-4 py-2 bg-white border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 cursor-pointer flex items-center gap-2 transition-colors">
                                    {isUploading ? <Loader2 size={16} className="animate-spin" /> : <LinkIcon size={16} />}
                                    이미지 업로드
                                    <input
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        onChange={handleImageUpload}
                                        disabled={isUploading}
                                    />
                                </label>
                                <p className="text-xs text-slate-400">
                                    * 10MB 이하의 이미지 파일 (JPG, PNG)<br />
                                    * 권장 사이즈: 1200 x 630 px
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Share Link */}
                    <div className="pt-6 border-t">
                        <label className="block text-sm font-bold text-slate-700 mb-2">지원자 공유 링크</label>
                        <div className="flex gap-2">
                            <div className="flex-1 bg-slate-100 border px-4 py-3 rounded-lg text-slate-600 font-mono text-sm truncate">
                                {candidateLink}
                            </div>
                            <button
                                onClick={() => {
                                    navigator.clipboard.writeText(candidateLink);
                                    toast.success('링크가 복사되었습니다!');
                                }}
                                className="px-4 py-2 border hover:bg-slate-50 rounded-lg text-slate-600 font-medium flex items-center gap-2"
                            >
                                <LinkIcon size={16} /> 복사
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Exam Configuration Section */}
            <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                <div className="p-6 border-b bg-slate-50">
                    <h2 className="text-xl font-bold text-slate-900">필기전형 (검사) 설정</h2>
                    <p className="text-sm text-slate-500">지원자가 응시할 적성/인성 검사를 선택합니다. (배포된 검사만 선택 가능)</p>
                </div>
                <div className="p-8">
                    <label className="block text-sm font-bold text-slate-700 mb-2">연결할 검사 선택</label>
                    <select
                        value={selectedTestId}
                        onChange={(e) => setSelectedTestId(e.target.value)}
                        className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-black bg-white"
                        style={{ color: 'black' }}
                    >
                        <option value="">검사를 선택하지 않음 (필기전형 생략)</option>
                        {activeTests.map(test => (
                            <option key={test.id} value={test.id}>
                                [{test.type === 'APTITUDE' ? '적성' : '인성'}] {test.title}
                            </option>
                        ))}
                    </select>
                    {activeTests.length === 0 && (
                        <p className="mt-2 text-sm text-red-500">
                            * 선택 가능한 활성 상태(ACTIVE)의 검사가 없습니다. 대시보드에서 검사를 배포해주세요.
                        </p>
                    )}
                    <p className="mt-2 text-sm text-slate-500">
                        * 선택된 검사는 지원자가 서류 제출 후 또는 지정된 전형 단계에서 응시하게 됩니다.
                    </p>
                </div>
            </div>

            {/* Form Configuration Section */}
            <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                <div className="p-6 border-b bg-slate-50">
                    <h2 className="text-xl font-bold text-slate-900">지원서 양식 설정</h2>
                    <p className="text-sm text-slate-500">자기소개서 문항 등 지원서 양식을 설정합니다.</p>
                </div>
                <div className="p-8 space-y-6">
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">자기소개서 유형</label>
                        <select
                            value={introType}
                            onChange={(e) => setIntroType(e.target.value as any)}
                            style={{ color: 'black' }}
                            className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-black bg-white"
                        >
                            <option value="TYPE_A">자유 양식 (단일 에세이)</option>
                            <option value="TYPE_B">문항별 답변 (Q&A)</option>
                        </select>
                        <p className="mt-2 text-sm text-slate-500">
                            {introType === 'TYPE_A'
                                ? '지원자가 자유롭게 자기소개를 작성할 수 있는 단일 텍스트 박스를 제공합니다.'
                                : '관리자가 설정한 질문들에 대해 각각 답변을 작성하는 양식을 제공합니다.'}
                        </p>
                    </div>

                    {introType === 'TYPE_B' && (
                        <div className="space-y-4 border rounded-lg p-6 bg-slate-50/50">
                            <div className="flex justify-between items-center mb-2">
                                <label className="block text-sm font-bold text-slate-700">질문 목록</label>
                                <button type="button" onClick={addQuestion} className="text-xs flex items-center gap-1 bg-blue-100 text-blue-700 px-2 py-1 rounded hover:bg-blue-200 transition">
                                    <Plus size={14} /> 질문 추가
                                </button>
                            </div>

                            {questions.length === 0 && (
                                <p className="text-sm text-slate-400 italic text-center py-4">등록된 질문이 없습니다. 질문을 추가해주세요.</p>
                            )}

                            {questions.map((q, idx) => (
                                <div key={idx} className="flex gap-2">
                                    <span className="py-3 text-slate-500 font-mono text-sm">{idx + 1}.</span>
                                    <input
                                        type="text"
                                        value={q}
                                        onChange={(e) => updateQuestion(idx, e.target.value)}
                                        placeholder={`질문 내용을 입력하세요 (예: 지원동기를 서술하시오)`}
                                        className="flex-1 px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-black"
                                    />
                                    <button onClick={() => removeQuestion(idx)} className="text-slate-400 hover:text-red-500 transition px-2">
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
