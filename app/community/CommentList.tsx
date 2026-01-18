'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Loader2, MoreVertical, Trash2, Edit2, X, Check } from 'lucide-react';
import { updateComment, deleteComment } from './actions';

interface Comment {
    id: string;
    content: string;
    created_at: string;
    user_id: string;
    users?: {
        role?: string;
    };
}

interface CommentListProps {
    comments: Comment[];
    postId: string;
    currentUserId?: string;
    isAdmin: boolean;
}

export default function CommentList({ comments, postId, currentUserId, isAdmin }: CommentListProps) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editContent, setEditContent] = useState('');

    const handleEditClick = (comment: Comment) => {
        setEditingId(comment.id);
        setEditContent(comment.content);
    };

    const handleCancelEdit = () => {
        setEditingId(null);
        setEditContent('');
    };

    const handleUpdate = async (commentId: string) => {
        if (!editContent.trim()) return;

        startTransition(async () => {
            const result = await updateComment(commentId, editContent);
            if (result.success) {
                toast.success('댓글이 수정되었습니다.');
                setEditingId(null);
                setEditContent('');
            } else {
                toast.error(result.error || '수정 실패');
            }
        });
    };

    const handleDelete = async (commentId: string) => {
        if (!confirm('정말 삭제하시겠습니까?')) return;

        startTransition(async () => {
            const result = await deleteComment(commentId);
            if (result.success) {
                toast.success('댓글이 삭제되었습니다.');
            } else {
                toast.error(result.error || '삭제 실패');
            }
        });
    };

    if (!comments || comments.length === 0) {
        return (
            <div className="text-center py-8 text-slate-400 bg-slate-50 rounded-2xl border border-slate-100">
                아직 댓글이 없습니다. 첫 댓글을 남겨주세요!
            </div>
        );
    }

    return (
        <div className="space-y-4 mb-8">
            {comments.map((comment) => {
                const isAuthor = currentUserId === comment.user_id;
                const canEdit = isAuthor; // Only author can edit usually
                const canDelete = isAuthor || isAdmin;

                const isEditing = editingId === comment.id;

                return (
                    <div key={comment.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative group">
                        <div className="flex justify-between items-start mb-2">
                            <div className="flex items-center gap-2">
                                {/* Check if comment author is Admin */}
                                {(comment.users?.role === 'ADMIN' || comment.users?.role === 'SUPER_ADMIN') ? (
                                    <>
                                        <div className="w-6 h-6 bg-indigo-600 rounded-full flex items-center justify-center text-xs font-bold text-white">M</div>
                                        <span className="text-sm font-bold text-indigo-700">Umen 관리자</span>
                                    </>
                                ) : (
                                    <>
                                        <div className="w-6 h-6 bg-indigo-100 rounded-full flex items-center justify-center text-xs font-bold text-indigo-600">U</div>
                                        <span className="text-sm font-bold text-slate-700">익명</span>
                                    </>
                                )}
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-xs text-slate-400">{new Date(comment.created_at).toLocaleDateString()}</span>

                                {/* Edit/Delete Controls */}
                                {!isEditing && (canEdit || canDelete) && (
                                    <div className="flex items-center gap-1 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                                        {canEdit && (
                                            <button
                                                onClick={() => handleEditClick(comment)}
                                                className="p-1 text-slate-400 hover:text-indigo-600 transition-colors"
                                                title="수정"
                                            >
                                                <Edit2 size={14} />
                                            </button>
                                        )}
                                        {canDelete && (
                                            <button
                                                onClick={() => handleDelete(comment.id)}
                                                className="p-1 text-slate-400 hover:text-red-600 transition-colors"
                                                title="삭제"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>

                        {isEditing ? (
                            <div className="mt-2">
                                <textarea
                                    value={editContent}
                                    onChange={(e) => setEditContent(e.target.value)}
                                    className="w-full bg-slate-50 border border-indigo-100 rounded-xl px-4 py-3 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-indigo-100 resize-none min-h-[100px]"
                                    placeholder="댓글 수정..."
                                    autoFocus
                                />
                                <div className="flex justify-end gap-2 mt-2">
                                    <button
                                        onClick={handleCancelEdit}
                                        className="px-3 py-1.5 text-xs font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors flex items-center gap-1"
                                        disabled={isPending}
                                    >
                                        <X size={12} /> 취소
                                    </button>
                                    <button
                                        onClick={() => handleUpdate(comment.id)}
                                        className="px-3 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors flex items-center gap-1"
                                        disabled={isPending}
                                    >
                                        {isPending ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                                        저장
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <p className="text-slate-600 text-sm leading-relaxed whitespace-pre-wrap">{comment.content}</p>
                        )}
                    </div>
                );
            })}
        </div>
    );
}
