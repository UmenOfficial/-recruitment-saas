'use client';

import { useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { AdminContent, createContent, deleteContent, togglePublish, updateContent } from './actions';
import { Plus, Trash2, Globe, Eye, EyeOff, Film, FileText, ExternalLink, Edit } from 'lucide-react';
import { toast } from 'sonner';
import Image from 'next/image';
import PostEditor from './PostEditor';

type ContentManagerProps = {
    initialContents: AdminContent[];
};

type ContentFormInputs = {
    title: string;
    type: 'VIDEO' | 'ARTICLE';
    content_url?: string;
    summary?: string;
    body?: string;
    thumbnail?: FileList;
};

export default function ContentManager({ initialContents }: ContentManagerProps) {
    const [isModalOpen, setIsModalOpen] = useState(false);
    // Editor value state (React Hook Form doesn't handle custom components well natively without Controller, 
    // but simple state sync is fine here)
    const [editorValue, setEditorValue] = useState('');
    const [editingId, setEditingId] = useState<string | null>(null);

    // We rely on standard navigation to refresh data after server actions
    // But since we receive initialContents as props, we might want to manually update the UI 
    // or just rely on Next.js Server Components refreshing the page.
    const contents = initialContents;

    const { register, handleSubmit, reset, watch, setValue, formState: { errors, isSubmitting } } = useForm<ContentFormInputs>({
        defaultValues: {
            type: 'VIDEO', // Default
        }
    });

    const selectedType = watch('type');

    const handleCreateClick = () => {
        setEditingId(null);
        setEditorValue('');
        reset({ type: 'VIDEO', title: '', content_url: '', summary: '' });
        setIsModalOpen(true);
    };

    const handleEditClick = (content: AdminContent) => {
        setEditingId(content.id);
        setValue('title', content.title);
        setValue('type', content.type);
        setValue('content_url', content.content_url || '');
        setValue('summary', content.summary || '');
        // For article body
        if (content.type === 'ARTICLE') {
            setEditorValue(content.body || '');
        } else {
            setEditorValue('');
        }
        setIsModalOpen(true);
    };

    const onSubmit = async (data: ContentFormInputs) => {
        try {
            const formData = new FormData();
            formData.append('title', data.title);
            formData.append('type', data.type);

            if (data.type === 'VIDEO') {
                formData.append('content_url', data.content_url || '');
                formData.append('summary', data.summary || '');
                if (data.thumbnail && data.thumbnail[0]) {
                    formData.append('thumbnail', data.thumbnail[0]);
                }
            } else {
                // ARTICLE
                formData.append('summary', data.summary || ''); // Summary is optional for Article but good to have
                formData.append('body', editorValue);
                // No thumbnail for article in this design (or keep existing if not null, handled in backend update logic)
            }

            if (editingId) {
                await updateContent(editingId, formData);
                toast.success('콘텐츠가 수정되었습니다.');
            } else {
                await createContent(formData);
                toast.success('콘텐츠가 등록되었습니다.');
            }

            setIsModalOpen(false);
            reset();
            setEditorValue('');
            setEditingId(null);
        } catch (error) {
            console.error(error);
            toast.error(editingId ? '수정 실패' : '등록 실패');
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('정말 삭제하시겠습니까?')) return;
        try {
            await deleteContent(id);
            toast.success('삭제되었습니다.');
        } catch (error) {
            toast.error('삭제 실패');
        }
    };

    const handleTogglePublish = async (id: string, currentStatus: boolean) => {
        try {
            await togglePublish(id, currentStatus);
            toast.success(currentStatus ? '비공개 처리되었습니다.' : '공개 처리되었습니다.');
        } catch (error) {
            toast.error('상태 변경 실패');
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">U-Class 관리</h1>
                    <p className="text-slate-500">홈페이지에 노출될 전문 콘텐츠를 관리합니다.</p>
                </div>
                <button
                    onClick={handleCreateClick}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium"
                >
                    <Plus size={18} />
                    새 콘텐츠 등록
                </button>
            </div>

            {/* Content List */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {contents.map((content) => (
                    <div key={content.id} className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow flex flex-col">
                        <div className="relative h-48 bg-slate-100">
                            {/* Logic for thumbnail display: 
                                - If thumbnail exists, show it.
                                - If VIDEO but no thumbnail, show Film icon.
                                - If ARTICLE, we don't have thumbnail, show FileText icon.
                            */}
                            {content.thumbnail_url ? (
                                <Image
                                    src={content.thumbnail_url}
                                    alt={content.title}
                                    fill
                                    className="object-cover"
                                />
                            ) : (
                                <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 gap-2 p-6 text-center">
                                    {content.type === 'VIDEO' ? <Film size={32} /> : <FileText size={32} />}
                                    {content.type === 'ARTICLE' && (
                                        <p className="text-xs line-clamp-3 px-4">{content.summary}</p>
                                    )}
                                </div>
                            )}

                            <div className="absolute top-3 right-3 flex gap-2">
                                <span className={`px-2 py-1 rounded text-xs font-bold ${content.type === 'VIDEO' ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'
                                    }`}>
                                    {content.type === 'VIDEO' ? 'VIDEO' : 'ARTICLE'}
                                </span>
                            </div>
                        </div>

                        <div className="p-5 flex-1 flex flex-col">
                            <h3 className="font-bold text-lg text-slate-800 mb-2 line-clamp-2">{content.title}</h3>
                            <p className="text-slate-500 text-sm mb-4 line-clamp-3 flex-1">
                                {content.type === 'ARTICLE' && !content.summary ? (
                                    <span className="text-slate-300 italic">요약 없음</span>
                                ) : (
                                    content.summary
                                )}
                            </p>

                            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                                {content.type === 'VIDEO' && content.content_url ? (
                                    <a
                                        href={content.content_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-1 text-xs text-slate-400 hover:text-indigo-600"
                                    >
                                        <ExternalLink size={14} />
                                        원본 보기
                                    </a>
                                ) : (
                                    <span className="text-xs text-slate-400">직접 작성됨</span>
                                )}

                                <div className="flex items-center gap-2 ml-auto">
                                    <button
                                        onClick={() => handleEditClick(content)}
                                        className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                        title="수정"
                                    >
                                        <Edit size={18} />
                                    </button>
                                    <button
                                        onClick={() => handleTogglePublish(content.id, content.is_published)}
                                        className={`p-2 rounded-lg transition-colors ${content.is_published
                                            ? 'text-green-600 bg-green-50 hover:bg-green-100'
                                            : 'text-slate-400 bg-slate-50 hover:bg-slate-100'
                                            }`}
                                        title={content.is_published ? '공개 중' : '비공개'}
                                    >
                                        {content.is_published ? <Eye size={18} /> : <EyeOff size={18} />}
                                    </button>
                                    <button
                                        onClick={() => handleDelete(content.id)}
                                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                        title="삭제"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}

                {contents.length === 0 && (
                    <div className="col-span-full py-20 text-center text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                        등록된 콘텐츠가 없습니다.
                    </div>
                )}
            </div>

            {/* Create Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className={`bg-white rounded-2xl w-full ${selectedType === 'ARTICLE' ? 'max-w-4xl' : 'max-w-lg'} max-h-[90vh] overflow-y-auto shadow-2xl transition-all`}>
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center sticky top-0 bg-white z-10">
                            <h2 className="text-xl font-bold text-slate-800">{editingId ? '콘텐츠 수정' : '새 콘텐츠 등록'}</h2>
                            <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                                ✕
                            </button>
                        </div>

                        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">

                            {/* Common Fields */}
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1">유형</label>
                                <select
                                    {...register('type')}
                                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                >
                                    <option value="VIDEO">VIDEO (YouTube)</option>
                                    <option value="ARTICLE">ARTICLE (칼럼)</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1">제목</label>
                                <textarea
                                    {...register('title', { required: '제목을 입력해주세요' })}
                                    rows={2}
                                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                                    placeholder="콘텐츠 제목"
                                />
                                {errors.title && <p className="text-red-500 text-xs mt-1">{errors.title.message}</p>}
                            </div>

                            {/* Type Specific Fields */}
                            {selectedType === 'VIDEO' ? (
                                <>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-bold text-slate-700 mb-1">링크 (URL)</label>
                                            <input
                                                {...register('content_url', { required: 'URL을 입력해주세요' })}
                                                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                                placeholder="https://youtu.be/..."
                                            />
                                            {errors.content_url && <p className="text-red-500 text-xs mt-1">{errors.content_url.message}</p>}
                                        </div>
                                        <div>
                                            <label className="block text-sm font-bold text-slate-700 mb-1">썸네일 이미지</label>
                                            <input
                                                type="file"
                                                accept="image/*"
                                                {...register('thumbnail')}
                                                className="w-full px-4 py-1.5 border border-slate-200 rounded-lg text-sm text-slate-500"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 mb-1">요약 설명</label>
                                        <textarea
                                            {...register('summary')}
                                            rows={3}
                                            className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                                            placeholder="영상에 대한 간략한 설명을 입력하세요"
                                        />
                                    </div>
                                </>
                            ) : (
                                <>
                                    {/* ARTICLE Fields */}
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 mb-1">요약 (메인 노출용)</label>
                                        <textarea
                                            {...register('summary')}
                                            rows={2}
                                            className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                                            placeholder="메인 페이지 카드에 표시될 한 줄 요약"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 mb-1">본문 (Editor)</label>
                                        <div className="border border-slate-200 rounded-lg overflow-hidden">
                                            <PostEditor value={editorValue} onChange={setEditorValue} />
                                        </div>
                                    </div>
                                </>
                            )}

                            <div className="pt-4 flex justify-end gap-2">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="px-4 py-2 text-slate-500 hover:bg-slate-100 rounded-lg font-medium transition-colors"
                                >
                                    취소
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 transition-colors disabled:opacity-50"
                                >
                                    {isSubmitting ? (editingId ? '수정 중...' : '등록 중...') : (editingId ? '수정하기' : '등록하기')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
