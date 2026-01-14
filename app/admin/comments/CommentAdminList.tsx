'use client';

import { useState } from 'react';
import { AdminCommentItem, AdminPostItem, deletePost } from './actions';
import { MessageCircle, Search, Filter, Lock, ExternalLink, CornerDownRight, Trash2, LayoutList } from 'lucide-react';
import { useRouter } from 'next/navigation';
import CommentResponseModal from './CommentResponseModal';
import { toast } from 'sonner';

export default function CommentAdminList({ initialComments, initialPosts }: { initialComments: AdminCommentItem[], initialPosts: AdminPostItem[] }) {
    const router = useRouter();
    const [activeTab, setActiveTab] = useState<'COMMENTS' | 'POSTS'>('COMMENTS');
    const [selectedComment, setSelectedComment] = useState<AdminCommentItem | null>(null);
    const [filter, setFilter] = useState<'ALL' | 'UNANSWERED'>('ALL');

    const filteredComments = initialComments.filter(c => {
        if (filter === 'UNANSWERED') return !c.has_reply;
        return true;
    });

    const handleDeletePost = async (postId: string) => {
        if (!confirm('정말 이 게시글을 삭제하시겠습니까? 관련 댓글도 모두 삭제됩니다.')) return;

        try {
            await deletePost(postId);
            toast.success('게시글이 삭제되었습니다.');
            router.refresh();
        } catch (error) {
            toast.error('삭제에 실패했습니다.');
            console.error(error);
        }
    };

    return (
        <div className="p-8 max-w-6xl mx-auto">
            <header className="flex justify-between items-end mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                        커뮤니티 관리
                    </h1>
                    <p className="text-slate-500 text-sm mt-1">U-Class 댓글 및 U-Talk 게시글을 통합 관리합니다.</p>
                </div>

                <div className="flex bg-slate-100 p-1 rounded-lg">
                    <button
                        onClick={() => setActiveTab('COMMENTS')}
                        className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${activeTab === 'COMMENTS'
                            ? 'bg-white text-indigo-600 shadow-sm'
                            : 'text-slate-500 hover:text-slate-700'
                            }`}
                    >
                        U-Class 댓글
                    </button>
                    <button
                        onClick={() => setActiveTab('POSTS')}
                        className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${activeTab === 'POSTS'
                            ? 'bg-white text-indigo-600 shadow-sm'
                            : 'text-slate-500 hover:text-slate-700'
                            }`}
                    >
                        U-Talk 게시글
                    </button>
                </div>
            </header>

            {activeTab === 'COMMENTS' ? (
                // --- Comments View ---
                <>
                    <div className="flex justify-end mb-4 gap-2">
                        <button
                            onClick={() => setFilter('ALL')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${filter === 'ALL'
                                ? 'bg-slate-800 text-white'
                                : 'bg-white text-slate-500 border hover:bg-slate-50'
                                }`}
                        >
                            전체
                        </button>
                        <button
                            onClick={() => setFilter('UNANSWERED')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${filter === 'UNANSWERED'
                                ? 'bg-indigo-600 text-white'
                                : 'bg-white text-slate-500 border hover:bg-slate-50'
                                }`}
                        >
                            미답변
                        </button>
                    </div>

                    <div className="grid gap-4">
                        {filteredComments.length === 0 ? (
                            <div className="text-center py-20 bg-slate-50 rounded-3xl border border-dashed border-slate-200">
                                <MessageCircle className="mx-auto text-slate-300 mb-4" size={48} />
                                <p className="text-slate-400 font-medium">표시할 댓글이 없습니다.</p>
                            </div>
                        ) : (
                            filteredComments.map(comment => (
                                <div key={comment.id} className="bg-white p-6 rounded-2xl border border-slate-100 hover:border-indigo-100 hover:shadow-md transition-all">
                                    <div className="flex justify-between items-start mb-3">
                                        <div className="flex items-center gap-3">
                                            <span className={`px-2 py-0.5 text-[10px] font-bold rounded uppercase tracking-wide ${comment.has_reply ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'
                                                }`}>
                                                {comment.has_reply ? 'ANSWERED' : 'WAITING'}
                                            </span>
                                            <div className="text-xs text-slate-400 flex items-center gap-1">
                                                <span>{new Date(comment.created_at).toLocaleDateString('ko-KR')}</span>
                                                <span>·</span>
                                                <span className="truncate max-w-[150px] font-medium text-slate-600" title={comment.content_title}>
                                                    {comment.content_title}
                                                </span>
                                            </div>
                                        </div>
                                        <a
                                            href={`/u-class/${comment.content_id}`}
                                            target="_blank"
                                            className="text-slate-300 hover:text-indigo-500 transition-colors"
                                            title="글 보러가기"
                                        >
                                            <ExternalLink size={16} />
                                        </a>
                                    </div>

                                    <div className="flex gap-4">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="font-bold text-slate-800 text-sm">{comment.user_name}</span>
                                                <span className="text-xs text-slate-400">({comment.user_email})</span>
                                                {comment.is_secret && <Lock size={12} className="text-slate-400" />}
                                            </div>
                                            <p className="text-slate-600 text-sm leading-relaxed whitespace-pre-wrap">{comment.content}</p>
                                        </div>

                                        <button
                                            onClick={() => setSelectedComment(comment)}
                                            className="h-fit px-4 py-2 bg-indigo-50 text-indigo-600 rounded-lg text-sm font-bold hover:bg-indigo-100 transition-colors whitespace-nowrap self-center"
                                        >
                                            답변하기
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </>
            ) : (
                // --- Posts View ---
                <div className="grid gap-4">
                    <div className="flex justify-end mb-2">
                        <span className="text-xs text-slate-400 font-medium">총 {initialPosts.length}개의 게시글</span>
                    </div>
                    {initialPosts.length === 0 ? (
                        <div className="text-center py-20 bg-slate-50 rounded-3xl border border-dashed border-slate-200">
                            <LayoutList className="mx-auto text-slate-300 mb-4" size={48} />
                            <p className="text-slate-400 font-medium">표시할 게시글이 없습니다.</p>
                        </div>
                    ) : (
                        initialPosts.map(post => (
                            <div key={post.id} className="bg-white p-6 rounded-2xl border border-slate-100 hover:border-red-100 hover:shadow-md transition-all group">
                                <div className="flex justify-between items-start mb-3">
                                    <div className="flex items-center gap-3">
                                        <span className={`px-2 py-0.5 text-[10px] font-bold rounded uppercase tracking-wide ${post.category === 'FREE' ? 'bg-slate-100 text-slate-600' :
                                            post.category === 'QNA' ? 'bg-orange-100 text-orange-600' :
                                                post.category === 'REVIEW' ? 'bg-green-100 text-green-600' :
                                                    'bg-indigo-100 text-indigo-600'
                                            }`}>
                                            {post.category}
                                        </span>
                                        <span className="text-xs text-slate-400">
                                            {new Date(post.created_at).toLocaleDateString('ko-KR')}
                                        </span>
                                    </div>
                                    <a
                                        href={`/community/${post.id}`}
                                        target="_blank"
                                        className="text-slate-300 hover:text-indigo-500 transition-colors"
                                        title="글 보러가기"
                                    >
                                        <ExternalLink size={16} />
                                    </a>
                                </div>

                                <div className="flex gap-4">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="font-bold text-slate-800 text-sm">{post.user_name}</span>
                                            <span className="text-xs text-slate-400">({post.user_email})</span>
                                        </div>
                                        <h3 className="font-bold text-slate-800 mb-1">{post.title}</h3>
                                        <p className="text-slate-500 text-sm line-clamp-2">{post.content}</p>

                                        <div className="flex items-center gap-3 mt-3 text-xs text-slate-400">
                                            <span>조회 {post.view_count}</span>
                                            <span>댓글 {post.comment_count}</span>
                                        </div>
                                    </div>

                                    <button
                                        onClick={() => handleDeletePost(post.id)}
                                        className="h-fit p-2 text-slate-300 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors self-center"
                                        title="게시글 삭제"
                                    >
                                        <Trash2 size={20} />
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}

            {selectedComment && (
                <CommentResponseModal
                    comment={selectedComment}
                    onClose={() => setSelectedComment(null)}
                    onSuccess={() => {
                        setSelectedComment(null);
                        router.refresh();
                    }}
                />
            )}
        </div>
    );
}
