'use client';

import { useEffect, useRef } from 'react';
import { useTestStore } from '@/lib/store/test-session';
import { toast, Toaster } from 'sonner';

export default function AntiCheatGuard() {
    const { logViolation, violationCount, isActive } = useTestStore();
    const hasWarnedRef = useRef<{ [key: number]: boolean }>({});

    useEffect(() => {
        if (!isActive) return;

        const handleVisibilityChange = () => {
            if (document.hidden) {
                handleViolation("Tab switching detected");
            }
        };

        const handleBlur = () => {
            handleViolation("Window focus lost");
        };

        const handleViolation = (reason: string) => {
            // Avoid spamming violations for the same event sequence
            // In a real implementation we might throttle this
            logViolation();

            // The toast will be triggered by the effect below observing count
            console.warn(`⚠️ Anti-Cheat Warning: ${reason}`);
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        window.addEventListener('blur', handleBlur);

        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            window.removeEventListener('blur', handleBlur);
        };
    }, [isActive, logViolation]);

    // Effect to trigger Toasts based on violation count
    useEffect(() => {
        if (!isActive) return;

        // Use a ref to prevent double-firing strict mode react effects
        // Warning: violationCount increments. 
        // 1st Strike
        if (violationCount === 1 && !hasWarnedRef.current[1]) {
            toast.warning('⚠️ Security Warning (1/3)', {
                description: 'Please keep this window focused. Leaving again will record a violation.',
                duration: 5000,
            });
            hasWarnedRef.current[1] = true;
        }

        // 2nd Strike
        if (violationCount === 2 && !hasWarnedRef.current[2]) {
            toast.error('⚠️ CRITICAL WARNING (2/3)', {
                description: 'One more violation will result in IMMEDIATE termination of your test session.',
                duration: 8000,
                action: {
                    label: 'I Understand',
                    onClick: () => console.log('Acknowledged'),
                },
            });
            hasWarnedRef.current[2] = true;
        }

        // 3rd Strike (Handled by parent for submission, but we show a final toast here too)
        if (violationCount === 3 && !hasWarnedRef.current[3]) {
            toast.error('🚫 TEST TERMINATED', {
                description: 'Multiple security violations detected. Submitting results...',
                duration: 5000,
            });
            hasWarnedRef.current[3] = true;
        }

    }, [violationCount, isActive]);

    return <Toaster position="top-center" richColors />;
}
