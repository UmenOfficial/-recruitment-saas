import Link from 'next/link';
import { CheckCircle, Home } from 'lucide-react';

export default function CompletedPage() {
    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
            <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-6 animate-bounce">
                <CheckCircle size={40} />
            </div>
            <h1 className="text-3xl font-bold text-slate-800 mb-2">Test Completed!</h1>
            <p className="text-slate-500 max-w-md mb-8">
                Your answers have been securely submitted. Our recruitment team will review your results and contact you shortly.
            </p>

            <Link
                href="/"
                className="flex items-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors"
            >
                <Home size={18} /> Return Home
            </Link>
        </div>
    );
}
