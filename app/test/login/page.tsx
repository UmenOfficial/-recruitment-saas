'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ShieldCheck, ArrowRight, Loader2, Code2 } from 'lucide-react';

export default function CandidateLoginPage() {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [name, setName] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            if (!email || !name) throw new Error('Please enter both name and email.');

            // For MVP Demo, we accept any input and just store it in session storage or url
            // In a real app, this would verify the candidate against the 'applications' table.

            // Simulate API check
            await new Promise(resolve => setTimeout(resolve, 800));

            // Redirect to the instructions/intake page
            router.push('/test/demo');

        } catch (err: any) {
            setError(err.message || 'Login failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
            <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md border border-slate-100">
                <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 text-white rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-200">
                        <Code2 size={32} />
                    </div>
                    <h1 className="text-2xl font-bold text-slate-800">Candidate Portal</h1>
                    <p className="text-slate-500 mt-2">Enter your details to access requirements and assessment.</p>
                </div>

                <form onSubmit={handleLogin} className="space-y-5">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="e.g. Hong Gildong"
                            className="w-full px-4 py-3 rounded-lg border focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Email Address</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="name@example.com"
                            className="w-full px-4 py-3 rounded-lg border focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                            required
                        />
                    </div>

                    {error && (
                        <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg text-center font-medium">
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-slate-900 hover:bg-slate-800 text-white font-semibold py-3.5 rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-70 shadow-md hover:shadow-lg transform active:scale-[0.98]"
                    >
                        {loading ? <Loader2 className="animate-spin" /> : <>Continue to Assessment <ArrowRight size={18} /></>}
                    </button>
                </form>

                <p className="text-center text-xs text-slate-400 mt-6 flex items-center justify-center gap-1">
                    <ShieldCheck size={12} />
                    Protected by Secure Assessment Guard
                </p>
            </div>
        </div>
    );
}
