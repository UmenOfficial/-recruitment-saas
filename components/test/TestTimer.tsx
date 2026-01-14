'use client';

import { useEffect } from 'react';
import { useTestStore } from '@/lib/store/test-session';
import { Clock, AlertTriangle } from 'lucide-react';

export default function TestTimer() {
    const { timeLeftSeconds, isActive, tickTimer, endSession } = useTestStore();

    useEffect(() => {
        let interval: NodeJS.Timeout;

        if (isActive && timeLeftSeconds > 0) {
            interval = setInterval(() => {
                tickTimer();
            }, 1000);
        } else if (timeLeftSeconds === 0 && isActive) {
            endSession();
            // Implementation note: You might want to trigger auto-submit here in the parent
        }

        return () => clearInterval(interval);
    }, [isActive, timeLeftSeconds, tickTimer, endSession]);

    const minutes = Math.floor(timeLeftSeconds / 60);
    const seconds = timeLeftSeconds % 60;
    const isUrgent = minutes < 5;

    return (
        <div className={`
      flex items-center gap-2 px-4 py-2 rounded-lg font-mono font-bold text-lg border shadow-sm transition-colors
      ${isUrgent ? 'bg-red-50 text-red-600 border-red-200 animate-pulse' : 'bg-white text-slate-700 border-slate-200'}
    `}>
            {isUrgent ? <AlertTriangle size={20} /> : <Clock size={20} />}
            <span>
                {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
            </span>
        </div>
    );
}
