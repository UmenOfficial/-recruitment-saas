'use client';

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { User } from "@supabase/supabase-js";
import { toast } from "sonner";

import { Menu, X } from "lucide-react";
import Logo from "@/components/common/Logo";

export default function LandingHeader() {
    const [user, setUser] = useState<User | null>(null);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const supabase = createClient();
    const router = useRouter();
    const pathname = usePathname();

    const handleLogout = async () => {
        try {
            toast.success("See U");
            await supabase.auth.signOut();

            // Clear local storage for pre-registration
            if (typeof window !== 'undefined') {
                localStorage.removeItem('registered');
            }

            setUser(null);
            setIsMobileMenuOpen(false);
            window.location.href = '/'; // Force full reload to reset client states
        } catch (error) {
            console.error("Logout failed", error);
        }
    };

    const toggleMobileMenu = () => setIsMobileMenuOpen(!isMobileMenuOpen);

    useEffect(() => {
        const checkUser = async () => {
            try {
                const { data, error } = await supabase.auth.getSession();
                if (error) {
                    // Handle invalid refresh token silently
                    if (error.message && (error.message.includes("Refresh Token") || error.message.includes("refresh_token_not_found"))) {
                        await supabase.auth.signOut();
                        setUser(null);
                        return;
                    }
                    console.warn("Session check warning:", error.message);
                }
                setUser(data.session?.user ?? null);
            } catch {
                // Ignore unexpected errors during session check
            }
        };

        checkUser();

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (event === 'SIGNED_OUT') {
                setUser(null);
            } else if (session) {
                setUser(session.user);
            } else {
                setUser(null);
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    // Close mobile menu when route changes (optional, but good UX)
    useEffect(() => {
        setIsMobileMenuOpen(false);
    }, [user]); // Close when user state changes, can also listen to pathname if we had access

    return (
        <nav className="fixed w-full z-50 bg-white/80 backdrop-blur-md border-b border-primary/10">
            <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
                <Logo className="z-50 relative" />

                {/* Desktop Menu */}
                <div className="hidden md:flex gap-2 items-center">
                    <Link
                        href="/community"
                        className="text-sm font-bold text-slate-500 hover:text-primary hover:bg-primary/5 transition-colors px-4 py-2 rounded-full"
                    >
                        U-Talk
                    </Link>
                    {user ? (
                        <>
                            <Link
                                href="/candidate/dashboard"
                                className={`text-sm font-bold transition-colors px-4 py-2 rounded-full ${pathname?.startsWith('/candidate')
                                    ? 'text-primary bg-primary/10'
                                    : 'text-slate-500 hover:text-primary hover:bg-primary/5'
                                    }`}
                            >
                                My Value Report
                            </Link>

                            <button
                                onClick={handleLogout}
                                className="text-sm font-bold text-slate-500 hover:text-primary hover:bg-primary/5 transition-colors px-4 py-2 rounded-full"
                            >
                                See U
                            </button>
                        </>
                    ) : (
                        <>
                            <Link
                                href="/login?next=/?loggedin=true"
                                className="text-sm font-bold text-slate-500 hover:text-primary hover:bg-primary/5 transition-colors px-4 py-2 rounded-full"
                            >
                                Enter U.
                            </Link>

                        </>
                    )}
                </div>

                {/* Mobile Menu Button */}
                <button
                    className="md:hidden z-50 relative p-2 -mr-2 text-slate-600"
                    onClick={toggleMobileMenu}
                >
                    {isMobileMenuOpen ? <X /> : <Menu />}
                </button>

                {/* Mobile Dropdown Menu */}
                {isMobileMenuOpen && (
                    <div className="absolute top-20 right-6 w-64 bg-white border border-slate-100 rounded-2xl shadow-xl flex flex-col p-2 md:hidden animate-in fade-in slide-in-from-top-5 duration-200 z-50">
                        <Link
                            href="/community"
                            className="text-base font-bold text-slate-700 hover:text-primary hover:bg-primary/5 px-4 py-3 rounded-xl transition-colors"
                            onClick={() => setIsMobileMenuOpen(false)}
                        >
                            U-Talk
                        </Link>

                        {user ? (
                            <>
                                <Link
                                    href="/candidate/dashboard"
                                    className="text-base font-bold text-primary hover:bg-primary/5 px-4 py-3 rounded-xl transition-colors"
                                    onClick={() => setIsMobileMenuOpen(false)}
                                >
                                    My Value Report
                                </Link>

                                <div className="h-px bg-slate-100 my-1 mx-2"></div>
                                <button
                                    onClick={handleLogout}
                                    className="text-sm font-medium text-slate-500 hover:text-red-600 hover:bg-red-50 px-4 py-3 rounded-xl transition-colors text-left"
                                >
                                    See U (Logout)
                                </button>
                            </>
                        ) : (
                            <>
                                <Link
                                    href="/login?next=/?loggedin=true"
                                    className="text-base font-bold text-primary hover:bg-primary/5 px-4 py-3 rounded-xl transition-colors"
                                    onClick={() => setIsMobileMenuOpen(false)}
                                >
                                    Enter U.
                                </Link>
                                <div className="h-px bg-slate-100 my-1 mx-2"></div>

                            </>
                        )}
                    </div>
                )}
            </div>
        </nav>
    );
}
