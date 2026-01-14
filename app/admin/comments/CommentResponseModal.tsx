'use client';

import { useState } from 'react';
import { createComment } from '@/app/u-class/actions';
import { AdminCommentItem } from './actions';
import { X, Send, Lock } from 'lucide-react';
import { toast } from 'sonner';

type Props = {
    comment: AdminCommentItem;
    onClose: () => void;
    onSuccess: () => void;
};

export default function CommentResponseModal({ comment, onClose, onSuccess }: Props) {
    const [content, setContent] = useState('');
    const [isSecret, setIsSecret] = useState(comment.is_secret); // Default to match parent
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async () => {
        if (!content.trim()) return;
        setIsLoading(true);

        try {
            await createComment(comment.content_id, content, isSecret, comment.id);
            toast.success('답변이 등록되었습니다.');
            onSuccess();
        } catch (error) {
            toast.error('답변 등록 실패');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                <div className="p-5 border-b flex justify-between items-center bg-slate-50">
                    <h3 className="font-bold text-slate-800">답변 작성하기</h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6">
                    {/* Original Context */}
                    <div className="bg-indigo-50 rounded-xl p-4 mb-6">
                        <div className="flex gap-2 text-xs text-indigo-600 font-bold mb-1">
                            <span>To: {comment.user_name}</span>
                            <span className="text-indigo-400">|</span>
                            <span className="truncate max-w-[200px]">{comment.content_title}</span>
                        </div>
                        <p className="text-sm text-slate-700">{comment.content}</p>
                    </div>

                    {/* Input */}
                    <textarea
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        placeholder="답변 내용을 입력하세요..."
                        className="w-full h-32 p-3 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none bg-white mb-4"
                        autoFocus
                    />

                    <div className="flex justify-between items-center">
                        <label className="flex items-center gap-2 cursor-pointer text-sm text-slate-500 hover:text-slate-700">
                            <input
                                type="checkbox"
                                checked={isSecret}
                                onChange={(e) => setIsSecret(e.target.checked)}
                                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                            />
                            <Lock size={14} />
                            <span>비밀글로 답변</span>
                        </label>

                        <div className="flex gap-2">
                            <button
                                onClick={onClose}
                                className="px-4 py-2 rounded-lg text-slate-500 hover:bg-slate-100 text-sm font-medium transition-colors"
                            >
                                취소
                            </button>
                            <button
                                onClick={handleSubmit}
                                disabled={isLoading || !content.trim()}
                                className="bg-indigo-600 text-white px-5 py-2 rounded-lg text-sm font-bold hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                            >
                                <Send size={14} />
                                등록
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
