export default function TestLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="min-h-screen bg-slate-100 flex flex-col">
            {/* Minimal Header */}
            <header className="bg-white border-b h-16 flex items-center justify-center px-6 shadow-sm z-10">
                <div className="flex items-center gap-2 font-semibold text-slate-700">
                    <span className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs">R</span>
                    Candidate Assessment Center
                </div>
            </header>

            <main className="flex-1 flex flex-col max-w-4xl w-full mx-auto p-4 md:p-8">
                {children}
            </main>
        </div>
    );
}
