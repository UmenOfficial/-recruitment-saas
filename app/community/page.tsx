import Link from "next/link";
import { MessageSquare, ImageIcon, MessageCircle } from "lucide-react";
import { fetchPosts } from "./actions";

export const dynamic = 'force-dynamic';

const CATEGORIES = [
    { id: 'ALL', label: '전체' },
    { id: 'FREE', label: '🗣️ 자유' },
    { id: 'QNA', label: '❓ 질문/답변' },
    { id: 'REVIEW', label: '📝 후기' },
    { id: 'REQUEST', label: '💡 검사요청' },
];

export default async function CommunityPage({
    searchParams,
}: {
    searchParams: Promise<{ category?: string }>
}) {
    const params = await searchParams;
    const category = params.category || 'ALL';
    const posts = await fetchPosts(category);

    return (
        <div className="space-y-6">
            {/* Category Filter */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
                {CATEGORIES.map((cat) => (
                    <Link
                        key={cat.id}
                        href={cat.id === 'ALL' ? '/community' : `/community?category=${cat.id}`}
                        className={`px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-colors ${category === cat.id
                            ? 'bg-slate-900 text-white shadow-md'
                            : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                            }`}
                    >
                        {cat.label}
                    </Link>
                ))}
            </div>

            {/* Post List */}
            <div className="space-y-3">
                {posts.length === 0 ? (
                    <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
                        <MessageSquare size={48} className="mx-auto text-slate-200 mb-4" />
                        <h3 className="text-lg font-bold text-slate-800">아직 게시글이 없습니다.</h3>
                        <p className="text-slate-500 mt-2">첫 번째 글의 주인공이 되어보세요!</p>
                        <Link href="/community/write" className="inline-block mt-6 px-6 py-2 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 transition-colors">
                            글쓰기
                        </Link>
                    </div>
                ) : (
                    posts.map((post: any) => (
                        <Link key={post.id} href={`/community/${post.id}`} className="block">
                            <div className="bg-white p-5 rounded-2xl border border-slate-200 hover:border-indigo-300 hover:shadow-md transition-all group">
                                <div className="flex justify-between items-start mb-2">
                                    <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${post.category === 'FREE' ? 'bg-slate-100 text-slate-600' :
                                        post.category === 'QNA' ? 'bg-orange-100 text-orange-600' :
                                            post.category === 'REVIEW' ? 'bg-green-100 text-green-600' :
                                                'bg-indigo-100 text-indigo-600'
                                        }`}>
                                        {post.category}
                                    </span>
                                    <span className="text-xs text-slate-400">
                                        {new Date(post.created_at).toLocaleDateString()}
                                    </span>
                                </div>
                                <h3 className="text-lg font-bold text-slate-800 group-hover:text-indigo-700 transition-colors line-clamp-1 mb-2">
                                    {post.title}
                                </h3>
                                <p className="text-sm text-slate-500 line-clamp-2 mb-4 h-[40px]">
                                    {post.content}
                                </p>
                                <div className="flex items-center gap-4 text-xs font-medium text-slate-400">
                                    {post.image_urls && post.image_urls.length > 0 && (
                                        <div className="flex items-center gap-1 text-slate-500">
                                            <ImageIcon size={14} />
                                            사진
                                        </div>
                                    )}
                                    <div className="flex items-center gap-1">
                                        <MessageCircle size={14} />
                                        댓글 {post.comment_count}
                                    </div>
                                    <div className="flex items-center gap-1">
                                        조회 {post.view_count}
                                    </div>
                                </div>
                            </div>
                        </Link>
                    ))
                )}
            </div>
        </div>
    );
}
