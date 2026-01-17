'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { addComment } from './actions';
import { Loader2, Send } from 'lucide-react';
import { toast } from 'sonner';

interface CommentFormProps {
    postId: string;
    isSecret?: boolean;
    isAdmin?: boolean;
}

export default function CommentForm({ postId, isSecret, isAdmin }: CommentFormProps) {
    const router = useRouter();
    const [content, setContent] = useState('');
    const [isPending, startTransition] = useTransition();

    // Permission Check Logic for UI (Optional, as Server Action also checks)
    // If Secret and Not Admin, we might want to hide the form or disable it.
    // User requested: "비밀글의 경우에는 관리자만 댓글을 남길 수 있게 해주고"
    // So if isSecret && !isAdmin, we should hide it or show "Only Admin".

    if (isSecret && !isAdmin) {
        return (
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-center text-sm text-slate-500">
                🔒 비밀글에는 관리자만 답변을 작성할 수 있습니다.
            </div>
        );
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!content.trim()) return;

        startTransition(async () => {
            const result = await addComment(postId, content);

            if (result.success) {
                toast.success('댓글이 등록되었습니다.');
                setContent('');
                router.refresh(); // Refresh server component to show new comment
            } else {
                toast.error(result.error || '댓글 등록 실패');
            }
        });
    };

    return (
        <form onSubmit={handleSubmit} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex gap-3">
            <div className="flex-1">
                <input
                    type="text"
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder={isSecret ? "관리자 답변 작성..." : "댓글을 입력하세요..."}
                    className="w-full bg-slate-50 rounded-xl px-4 py-3 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-indigo-100 transition-all placeholder:text-slate-400"
                    disabled={isPending}
                />
            </div>
            <button
                type="submit"
                disabled={isPending || !content.trim()}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded-xl font-bold flex items-center justify-center transition-colors min-w-[80px]"
            >
                {isPending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
            </button>
        </form>
    );
}
