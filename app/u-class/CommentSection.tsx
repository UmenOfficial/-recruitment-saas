'use client';

import { useState } from 'react';
import { Comment, createComment, deleteComment } from './actions';
import { createClient } from '@/lib/supabase/client';
import { User, Lock, CornerDownRight, Trash2, Send, MessageCircle } from 'lucide-react';
import { toast } from 'sonner';

type CommentSectionProps = {
    contentId: string;
    initialComments: Comment[];
    currentUser: any; // Supabase User object
    isAdmin: boolean;
};

export default function CommentSection({ contentId, initialComments, currentUser, isAdmin }: CommentSectionProps) {
    const [replyTo, setReplyTo] = useState<string | null>(null); // ID of comment being replied to
    const [isLoading, setIsLoading] = useState(false);

    // Form States
    const [newComment, setNewComment] = useState('');
    const [isSecret, setIsSecret] = useState(false);

    const handleSubmit = async (parentId: string | null = null, content: string, secret: boolean) => {
        if (!content.trim()) return;
        if (!currentUser) {
            toast.error('로그인이 필요합니다.');
            return;
        }

        setIsLoading(true);
        try {
            await createComment(contentId, content, secret, parentId);
            toast.success('댓글이 등록되었습니다.');
            setNewComment('');
            setReplyTo(null);
        } catch (error) {
            toast.error('댓글 등록 중 오류가 발생했습니다.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleDelete = async (commentId: string) => {
        if (!confirm('댓글을 삭제하시겠습니까?')) return;
        try {
            await deleteComment(commentId, contentId);
            toast.success('삭제되었습니다.');
        } catch (error) {
            toast.error('삭제 실패');
        }
    };

    const CommentItem = ({ comment, isReply = false }: { comment: Comment, isReply?: boolean }) => {
        const [replyContent, setReplyContent] = useState('');
        const [replySecret, setReplySecret] = useState(comment.is_secret); // Default to query's secret setting

        const isMyComment = currentUser && comment.user_id === currentUser.id;
        const showDelete = isMyComment || isAdmin;

        return (
            <div className={`group ${isReply ? 'ml-12 mt-3 pl-4 border-l-2 border-slate-100' : 'mb-6 pb-6 border-b border-slate-50 last:border-0'}`}>
                <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-2">
                        <div className={`p-1.5 rounded-full ${isReply ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-100 text-slate-500'}`}>
                            {isReply ? <CornerDownRight size={14} /> : <User size={16} />}
                        </div>
                        <div>
                            <span className="text-sm font-bold text-slate-700 block">
                                {comment.user?.full_name || '사용자'}
                                {comment.user_id === currentUser?.id && <span className="text-xs text-indigo-500 ml-1">(나)</span>}
                                {comment.id // Check if admin roughly (not strict check on UI, strict on server)
                                    // Actually better to rely on props if we had user roles in comment data, but for now simplify.
                                    // If we wanted 'Admin' badge, user role needed in join.
                                }
                            </span>
                            <span className="text-xs text-slate-400">
                                {new Date(comment.created_at).toLocaleDateString('ko-KR')} {new Date(comment.created_at).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        {/* Reply Button (Only for Root comments and if Admin) */}
                        {/* Rule: Admin can reply to anything. Users? Maybe users can reply too? Assuming yes. */}
                        {/* Requirement said 'Admin can answer'. Let's allow Admin to answer. Can users reply to users? Let's allow it for now. */}
                        {!isReply && isAdmin && (
                            <button
                                onClick={() => setReplyTo(replyTo === comment.id ? null : comment.id)}
                                className="text-xs text-indigo-600 hover:underline px-2"
                            >
                                답변달기
                            </button>
                        )}

                        {showDelete && (
                            <button
                                onClick={() => handleDelete(comment.id)}
                                className="text-slate-400 hover:text-red-500 p-1"
                                title="삭제"
                            >
                                <Trash2 size={14} />
                            </button>
                        )}
                    </div>
                </div>

                <div className="text-slate-700 text-sm leading-relaxed mb-2">
                    {comment.is_secret && (
                        <Lock size={12} className="inline-block mr-1 mb-0.5 text-slate-400" />
                    )}
                    {comment.content}
                </div>

                {/* Reply Form */}
                {replyTo === comment.id && (
                    <div className="mt-3 bg-slate-50 p-4 rounded-xl animate-in fade-in slide-in-from-top-2">
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-xs font-bold text-slate-500">답변 작성</span>
                            <div className="flex items-center gap-2">
                                <label className="flex items-center gap-1 cursor-pointer text-xs text-slate-500 hover:text-slate-700">
                                    <input
                                        type="checkbox"
                                        checked={replySecret}
                                        onChange={(e) => setReplySecret(e.target.checked)}
                                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-3 h-3"
                                    />
                                    비밀글
                                </label>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={replyContent}
                                onChange={(e) => setReplyContent(e.target.value)}
                                placeholder="답변 내용을 입력하세요..."
                                className="flex-1 px-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        handleSubmit(comment.id, replyContent, replySecret);
                                        setReplyContent('');
                                    }
                                }}
                            />
                            <button
                                onClick={() => {
                                    handleSubmit(comment.id, replyContent, replySecret);
                                    setReplyContent('');
                                }}
                                disabled={isLoading}
                                className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition"
                            >
                                <Send size={16} />
                            </button>
                        </div>
                    </div>
                )}

                {/* Nested Replies */}
                {comment.replies && comment.replies.length > 0 && (
                    <div className="mt-2">
                        {comment.replies.map(reply => (
                            <CommentItem key={reply.id} comment={reply} isReply={true} />
                        ))}
                    </div>
                )}
            </div>
        );
    };

    return (
        <section className="max-w-3xl mx-auto mt-16 px-6">
            <div className="flex items-center gap-2 mb-8">
                <MessageCircle className="text-slate-800" />
                <h3 className="text-2xl font-bold text-slate-800">
                    Comment <span className="text-indigo-600">{initialComments.length + (initialComments.reduce((acc, curr) => acc + (curr.replies?.length || 0), 0))}</span>
                </h3>
            </div>

            {/* Main Input */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 mb-10 shadow-sm">
                {!currentUser ? (
                    <div className="text-center py-4">
                        <p className="text-slate-500 text-sm mb-2">댓글을 작성하려면 로그인이 필요합니다.</p>
                        <a href="/login" className="text-indigo-600 font-bold hover:underline text-sm">로그인하기</a>
                    </div>
                ) : (
                    <>
                        <div className="flex gap-3 mb-4">
                            <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-xs">
                                {currentUser.user_metadata?.full_name?.[0] || 'U'}
                            </div>
                            <div className="flex-1">
                                <span className="text-sm font-bold text-slate-700 block mb-1">
                                    {currentUser.user_metadata?.full_name || '사용자'}
                                </span>
                                <textarea
                                    value={newComment}
                                    onChange={(e) => setNewComment(e.target.value)}
                                    placeholder="질문이나 의견을 남겨주세요."
                                    className="w-full h-24 p-3 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none bg-slate-50 focus:bg-white transition-colors"
                                />
                            </div>
                        </div>
                        <div className="flex justify-between items-center pl-11">
                            <label className="flex items-center gap-2 cursor-pointer text-sm text-slate-500 hover:text-slate-700">
                                <input
                                    type="checkbox"
                                    checked={isSecret}
                                    onChange={(e) => setIsSecret(e.target.checked)}
                                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                />
                                <Lock size={14} />
                                <span>비밀글로 작성</span>
                            </label>
                            <button
                                onClick={() => handleSubmit(null, newComment, isSecret)}
                                disabled={isLoading || !newComment.trim()}
                                className="bg-slate-900 text-white px-6 py-2.5 rounded-xl font-bold hover:bg-slate-800 transition-colors disabled:opacity-50 flex items-center gap-2"
                            >
                                <Send size={16} />
                                등록
                            </button>
                        </div>
                    </>
                )}
            </div>

            {/* Comments List */}
            <div className="space-y-2">
                {initialComments.length === 0 ? (
                    <div className="text-center py-12 text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                        첫 번째 댓글을 남겨보세요!
                    </div>
                ) : (
                    initialComments.map(comment => (
                        <CommentItem key={comment.id} comment={comment} />
                    ))
                )}
            </div>
        </section>
    );
}
