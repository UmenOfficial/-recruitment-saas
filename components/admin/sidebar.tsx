'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import Logo from "@/components/common/Logo";
import { LayoutDashboard, FileText, Users, LogOut, Briefcase, MessageCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

export function Sidebar() {
    const router = useRouter();

    const handleLogout = async () => {
        toast.success("See U");
        await supabase.auth.signOut();
        router.push('/admin/login');
    };

    return (
        <aside className="w-64 bg-white border-r shadow-sm hidden md:flex flex-col">
            <div className="p-6 border-b">
                <Logo isLink={false} />
                <p className="text-xs text-slate-500 mt-1">관리자 콘솔</p>
            </div>

            <nav className="flex-1 p-4 space-y-1">
                <NavLink href="/admin/dashboard" icon={<LayoutDashboard size={18} />}>
                    대시보드
                </NavLink>
                <NavLink href="/admin/postings" icon={<Briefcase size={18} />}>
                    채용 공고
                </NavLink>

                {/* 문제 관리 (Questions) */}
                <div className="pt-2 pb-1">
                    <Link href="/admin/questions" className="flex items-center gap-3 px-4 py-2 text-sm font-semibold text-slate-500 hover:text-blue-600 transition-colors cursor-pointer group">
                        <FileText size={18} className="group-hover:text-blue-600 transition-colors" />
                        문항 관리
                    </Link>
                    <div className="ml-5 pl-3 border-l border-slate-200 mt-1 space-y-1">
                        <NavLink href="/admin/questions?tab=APTITUDE" isSubItem>
                            적성검사 문항
                        </NavLink>
                        <NavLink href="/admin/questions?tab=PERSONALITY" isSubItem>
                            인성검사 문항
                        </NavLink>
                    </div>
                </div>

                {/* 검사 관리 (Tests) */}
                <div className="pt-2 pb-1">
                    <Link href="/admin/tests" className="flex items-center gap-3 px-4 py-2 text-sm font-semibold text-slate-500 hover:text-blue-600 transition-colors cursor-pointer group">
                        <FileText size={18} className="group-hover:text-blue-600 transition-colors" />
                        검사 관리
                    </Link>
                    <div className="ml-5 pl-3 border-l border-slate-200 mt-1 space-y-1">
                        {/* 적성검사 Sub-menu */}
                        <div className="px-2 py-1.5 text-xs font-semibold text-slate-400 mt-1">적성검사</div>
                        <NavLink href="/admin/tests/aptitude" isSubItem>
                            검사 만들기
                        </NavLink>
                        <NavLink href="/admin/tests/aptitude/answers" isSubItem>
                            정답 관리
                        </NavLink>
                        <NavLink href="/admin/tests/aptitude/scoring" isSubItem>
                            채점 관리
                        </NavLink>

                        {/* 인성검사 Sub-menu */}
                        <div className="px-2 py-1.5 text-xs font-semibold text-slate-400 mt-3">인성검사</div>
                        <NavLink href="/admin/tests/personality" isSubItem>
                            검사 만들기
                        </NavLink>
                        <NavLink href="/admin/tests/personality/competencies" isSubItem>
                            역량방정식 생성
                        </NavLink>
                        <NavLink href="/admin/tests/personality/scoring" isSubItem>
                            채점 관리
                        </NavLink>

                    </div>
                </div>

                <NavLink href="/admin/candidates" icon={<Users size={18} />}>
                    지원자 현황
                </NavLink>

                <div className="pt-4 pb-2 border-t border-slate-100 mt-4">
                    <p className="px-6 text-xs font-semibold text-slate-400 mb-2">콘텐츠</p>
                    <NavLink href="/admin/contents" icon={<Briefcase size={18} />}>
                        U-Class 관리
                    </NavLink>
                    <NavLink href="/admin/comments" icon={<MessageCircle size={18} />}>
                        댓글 관리
                    </NavLink>
                </div>
            </nav>

            <div className="p-4 border-t">
                <button
                    onClick={handleLogout}
                    className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-slate-600 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors"
                >
                    <LogOut size={18} />
                    See U
                </button>
            </div>
        </aside>
    );
}

function NavLink({ href, icon, children, isSubItem = false }: { href: string; icon?: React.ReactNode; children: React.ReactNode; isSubItem?: boolean }) {
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const [targetPath, targetQuery] = href.split('?');
    const isActive = pathname === targetPath && (!targetQuery || searchParams.get('tab') === new URLSearchParams(targetQuery).get('tab'));

    if (isSubItem) {
        return (
            <Link
                href={href}
                className={`relative flex items-center gap-2 px-3 py-2 text-sm rounded-md transition-colors
                    ${isActive
                        ? 'bg-blue-50 text-blue-700 font-medium'
                        : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'}
                `}
            >
                {/* Active Indicator Dot */}
                {isActive && (
                    <span className="absolute -left-[17px] top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-blue-600 ring-4 ring-blue-50"></span>
                )}
                {children}
            </Link>
        )
    }

    return (
        <Link
            href={href}
            className={`flex items-center gap-3 px-4 py-2.5 text-sm font-medium rounded-lg transition-colors group
                ${isActive
                    ? 'bg-blue-50 text-blue-600'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-blue-600'}
            `}
        >
            <span className={`transition-transform duration-200 ${isActive ? 'scale-110 text-blue-600' : 'text-slate-400 group-hover:text-blue-600'}`}>
                {icon}
            </span>
            {children}
        </Link>
    );
}
