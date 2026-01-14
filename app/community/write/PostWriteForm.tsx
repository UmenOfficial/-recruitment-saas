'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ImagePlus, X, Rocket, Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { createPostAction } from './actions';
import { toast } from 'sonner';

export default function PostWriteForm() {
    const router = useRouter();
    const [images, setImages] = useState<File[]>([]);
    const [previews, setPreviews] = useState<string[]>([]);
    const [uploading, setUploading] = useState(false);
    const [saving, setSaving] = useState(false);

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const newFiles = Array.from(e.target.files);
            setImages(prev => [...prev, ...newFiles]);

            // Create previews
            newFiles.forEach(file => {
                const reader = new FileReader();
                reader.onloadend = () => {
                    setPreviews(prev => [...prev, reader.result as string]);
                };
                reader.readAsDataURL(file);
            });
        }
    };

    const removeImage = (idx: number) => {
        setImages(prev => prev.filter((_, i) => i !== idx));
        setPreviews(prev => prev.filter((_, i) => i !== idx));
    };

    const handleSubmit = async (formData: FormData) => {
        setSaving(true);
        try {
            // 1. Upload Images
            const imageUrls: string[] = [];
            if (images.length > 0) {
                setUploading(true);
                const supabase = createClient();

                for (const file of images) {
                    const ext = file.name.split('.').pop();
                    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;
                    const { data, error } = await supabase.storage
                        .from('community-images')
                        .upload(fileName, file);

                    if (error) throw error;

                    const { data: { publicUrl } } = supabase.storage
                        .from('community-images')
                        .getPublicUrl(fileName);

                    imageUrls.push(publicUrl);
                }
            }

            // 2. Submit Post
            formData.append('image_urls', JSON.stringify(imageUrls));
            const result = await createPostAction(formData);

            if (result?.id) {
                toast.success('글이 등록되었습니다!');
                router.push(`/community/${result.id}`);
            }

        } catch (error: any) {
            console.error(error);
            toast.error(error.message || '글 작성에 실패했습니다.');
            setSaving(false);
            setUploading(false);
        }
    };

    return (
        <form action={handleSubmit} className="bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm space-y-6">

            {/* Category */}
            <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">카테고리</label>
                <div className="flex gap-3">
                    {['FREE', 'QNA', 'REVIEW', 'REQUEST'].map((cat) => (
                        <label key={cat} className="cursor-pointer">
                            <input type="radio" name="category" value={cat} className="peer sr-only" defaultChecked={cat === 'FREE'} />
                            <div className="px-4 py-2 rounded-xl text-sm font-bold border border-slate-200 text-slate-500 peer-checked:bg-indigo-600 peer-checked:text-white peer-checked:border-indigo-600 hover:bg-slate-50 transition-all">
                                {cat === 'FREE' ? '🗣️ 자유' :
                                    cat === 'QNA' ? '❓ 질문/답변' :
                                        cat === 'REVIEW' ? '📝 후기' : '💡 검사요청'}
                            </div>
                        </label>
                    ))}
                </div>
            </div>

            {/* Title */}
            <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">제목</label>
                <input
                    type="text"
                    name="title"
                    required
                    placeholder="제목을 입력하세요"
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent font-bold placeholder:font-normal"
                />
            </div>

            {/* Content */}
            <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">내용</label>
                <textarea
                    name="content"
                    required
                    rows={10}
                    placeholder="자유롭게 이야기를 나누어보세요. (취업 고민, 면접 후기 등)"
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none leading-relaxed"
                ></textarea>
            </div>

            {/* Image Upload */}
            <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">사진 첨부 (선택)</label>
                <div className="flex flex-wrap gap-4">
                    {previews.map((src, i) => (
                        <div key={i} className="relative w-24 h-24 rounded-xl overflow-hidden border border-slate-200 group">
                            <img src={src} alt="Preview" className="w-full h-full object-cover" />
                            <button
                                type="button"
                                onClick={() => removeImage(i)}
                                className="absolute top-1 right-1 p-1 bg-black/50 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                                <X size={12} />
                            </button>
                        </div>
                    ))}
                    <label className="w-24 h-24 rounded-xl border-2 border-dashed border-slate-300 flex flex-col items-center justify-center text-slate-400 cursor-pointer hover:border-indigo-400 hover:text-indigo-500 transition-colors">
                        <ImagePlus size={24} className="mb-1" />
                        <span className="text-xs font-bold">추가</span>
                        <input type="file" accept="image/*" multiple onChange={handleImageChange} className="hidden" />
                    </label>
                </div>
            </div>

            {/* Submit Button */}
            <div className="pt-4 border-t border-slate-100 flex justify-end">
                <button
                    type="submit"
                    disabled={saving}
                    className="px-8 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 shadow-lg hover:translate-y-[-2px] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                    {saving ? (
                        <>
                            <Loader2 size={18} className="animate-spin" />
                            {uploading ? '이미지 업로드 중...' : '게시글 저장 중...'}
                        </>
                    ) : (
                        <>
                            <Rocket size={18} />
                            작성 완료
                        </>
                    )}
                </button>
            </div>
        </form>
    );
}
