'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Plus, Briefcase, Calendar, MoreHorizontal, Loader2 } from 'lucide-react';
import { toast, Toaster } from 'sonner';

interface Posting {
    id: string;
    title: string;
    created_at: string;
    is_active: boolean;
}

/**
 * 채용 공고 관리 페이지
 * 
 * 관리자가 새로운 채용 공고를 생성하고 관리할 수 있는 페이지입니다.
 * (단순화된 버전: 제목 입력만으로 생성)
 */
export default function PostingsPage() {
    const [postings, setPostings] = useState<Posting[]>([]);
    const [loading, setLoading] = useState(true);
    const [isCreating, setIsCreating] = useState(false);
    const [title, setTitle] = useState('');
    const [companyId, setCompanyId] = useState<string | null>(null);
    const [userRole, setUserRole] = useState<string | null>(null);

    useEffect(() => {
        fetchUserCompanyAndPostings();
    }, []);

    async function fetchUserCompanyAndPostings() {
        setLoading(true);

        const { data: { user } } = await supabase.auth.getUser();

        if (user) {
            // 1. Fetch User Role
            const { data: userData } = await supabase
                .from('users')
                .select('role')
                .eq('id', user.id)
                .single();

            if (userData) {
                setUserRole((userData as any).role);
            } else {
                // [SELF-HEALING] If user missing in public.users, create it as SUPER_ADMIN
                const { error: insertError } = await (supabase.from('users') as any).insert({
                    id: user.id,
                    email: user.email,
                    role: 'SUPER_ADMIN',
                    full_name: 'Auto Admin',
                    is_active: true
                });

                if (!insertError) {
                    setUserRole('SUPER_ADMIN');
                    toast.success('관리자 계정이 자동으로 초기화되었습니다.');
                } else {
                    toast.error('계정 초기화 실패: ' + insertError.message);
                }
            }

            // 2. Fetch Company ID (if exists)
            const { data: memberData } = await supabase
                .from('company_members')
                .select('company_id')
                .eq('user_id', user.id)
                .single();

            if (memberData) {
                setCompanyId((memberData as any).company_id);
            }
        }

        const { data } = await supabase.from('postings').select('*').order('created_at', { ascending: false });
        setPostings(data || []);
        setLoading(false);
    }

    async function handleCreate() {
        if (!title.trim()) {
            toast.error('공고 제목을 입력해주세요.');
            return;
        }

        // 권한 체크: CompanyId가 있거나, UserRole이 SUPER_ADMIN이어야 함
        if (!companyId && userRole !== 'SUPER_ADMIN') {
            toast.error("회사 정보를 불러오지 못했습니다. (슈퍼 어드민이거나 회사에 소속되어야 합니다.)");
            return;
        }

        setIsCreating(true); // Use isCreating for button state
        const { error } = await (supabase.from('postings') as any).insert({
            title,
            company_id: companyId, // can be null if SUPER_ADMIN (global posting)
            jds: "{}",
            is_active: true
        });

        if (error) {
            toast.error("공고 생성 실패: " + error.message);
        } else {
            toast.success("공고가 생성되었습니다.");
            setTitle("");
            fetchUserCompanyAndPostings(); // Refresh list
        }
        setIsCreating(false); // Use isCreating for button state
    }

    return (
        <div className="space-y-6">
            <Toaster position="top-right" />

            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">채용 공고 관리</h1>
                    <p className="text-gray-500 mt-1">진행 중인 채용 공고를 관리하고 새로운 공고를 등록합니다.</p>
                </div>
                {userRole === 'SUPER_ADMIN' && (
                    <span className="px-3 py-1 bg-purple-100 text-purple-800 text-xs font-bold rounded-full uppercase tracking-wide">
                        Super Admin Mode
                    </span>
                )}
            </div>

            {/* CREATE POSTING CARD */}
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                <h2 className="text-lg font-semibold text-gray-800 mb-4">새 공고 만들기</h2>
                <div className="flex gap-3">
                    <input
                        type="text"
                        placeholder="공고 제목을 입력하세요 (예: 마케팅 팀장 채용)"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        className="flex-1 px-4 py-3 border rounded-xl outline-none focus:ring-2 focus:ring-blue-100 text-black"
                    />
                    <button
                        onClick={handleCreate}
                        disabled={isCreating} // Use isCreating for button state
                        className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-bold transition-all flex items-center gap-2"
                    >
                        {isCreating ? <Loader2 className="animate-spin" /> : <><Plus size={20} /> 공고 게시</>}
                    </button>
                </div>
                {!companyId && userRole !== 'SUPER_ADMIN' && !loading && (
                    <p className="text-xs text-red-500 mt-2 font-bold">
                        * 주의: 회사 정보를 찾을 수 없어 공고를 생성할 수 없습니다. (슈퍼 어드민 권한이 필요하거나 회사에 소속되어야 합니다.)
                    </p>
                )}
                {userRole === 'SUPER_ADMIN' && !companyId && (
                    <p className="text-xs text-purple-600 mt-2 font-medium">
                        * 슈퍼 어드민 권한으로 회사 없이 공고를 생성합니다. (전체 공고로 등록됨)
                    </p>
                )}
                <p className="text-xs text-gray-400 mt-2">
                    * 간편 생성 모드: 상세 JD 및 디자인 템플릿 설정은 생성 후 편집 메뉴에서 가능합니다.
                </p>
            </div>

            {/* POSTINGS LIST */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {loading ? (
                    <div className="col-span-3 text-center py-12 text-slate-400">로딩 중...</div>
                ) : postings.length === 0 ? (
                    <div className="col-span-full py-20 text-center text-gray-400 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                        <Briefcase className="w-12 h-12 mx-auto mb-3 opacity-20" />
                        등록된 공고가 없습니다.
                    </div>
                ) : (
                    postings.map((posting) => (
                        <div key={posting.id} className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow group">
                            <div className="flex justify-between items-start mb-3">
                                <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                                    <Briefcase className="w-5 h-5" />
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className={`px-2 py-0.5 text-xs font-medium rounded ${posting.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                                        {posting.is_active ? 'Active' : 'Draft'}
                                    </span>
                                    <button className="text-gray-400 hover:text-gray-600">
                                        <MoreHorizontal className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                            <h3 className="font-bold text-gray-900 mb-1 group-hover:text-blue-600 transition-colors line-clamp-1">
                                {posting.title}
                            </h3>
                            <p className="text-xs text-gray-400 mb-4 flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {new Date(posting.created_at).toLocaleDateString()}
                            </p>

                            <Link href={`/admin/postings/${posting.id}`} className="block w-full text-center py-2 bg-gray-50 hover:bg-blue-50 text-blue-600 font-medium text-sm rounded-lg transition-colors">
                                관리하기
                            </Link>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
