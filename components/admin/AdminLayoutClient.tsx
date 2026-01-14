"use client";

import { Sidebar } from "@/components/admin/sidebar";
import { usePathname } from "next/navigation";

export default function AdminLayoutClient({
    children,
}: {
    children: React.ReactNode;
}) {
    const pathname = usePathname();
    const isLoginPage = pathname === "/admin/login";

    return (
        <div className="flex h-screen bg-gray-50">
            {/* Side bar - hidden on login page */}
            {!isLoginPage && <Sidebar />}

            {/* Main Content Area */}
            <main className="flex-1 overflow-auto">
                {!isLoginPage && (
                    <header className="h-16 bg-white border-b flex items-center justify-between px-6 sticky top-0 z-10">
                        <h2 className="font-semibold text-slate-800">관리자</h2>
                        <div className="flex items-center gap-4">
                            {/* Profile Header Item */}
                            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold text-xs">
                                AD
                            </div>
                        </div>
                    </header>
                )}
                <div className={!isLoginPage ? "p-6 max-w-7xl mx-auto" : ""}>
                    {children}
                </div>
            </main>
        </div>
    );
}
