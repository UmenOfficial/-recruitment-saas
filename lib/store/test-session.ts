import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Database } from '@/types/database';

type Question = Database['public']['Tables']['questions']['Row'];

interface TestSessionState {
    questions: Question[];
    currentQuestionIndex: number;
    answers: Record<string, number>; // questionId -> selectedOptionIndex
    timeLeftSeconds: number;
    isActive: boolean;
    violationCount: number;

    // Actions
    initSession: (questions: Question[], durationMinutes: number) => void;
    setAnswer: (questionId: string, optionIndex: number) => void;
    nextQuestion: () => void;
    prevQuestion: () => void;
    tickTimer: () => void;
    logViolation: () => void;
    endSession: () => void;
    // New: Hydration check
    hasHydrated: boolean;
    setHasHydrated: (state: boolean) => void;
    // Server Sync
    syncWithServer: (serverTimeLeft: number) => void;
}

export const useTestStore = create<TestSessionState>()(
    persist(
        (set) => ({
            questions: [],
            currentQuestionIndex: 0,
            answers: {},
            timeLeftSeconds: 0,
            isActive: false,
            violationCount: 0,
            hasHydrated: false,

            setHasHydrated: (state) => set({ hasHydrated: state }),


            syncWithServer: (serverTimeLeft) => set({ timeLeftSeconds: serverTimeLeft }),

            initSession: (questions, durationMinutes) => set({
                questions,
                currentQuestionIndex: 0,
                answers: {},
                timeLeftSeconds: durationMinutes * 60,
                isActive: true,
                violationCount: 0
            }),

            setAnswer: (qId, optIdx) => set((state) => ({
                answers: { ...state.answers, [qId]: optIdx }
            })),

            nextQuestion: () => set((state) => ({
                currentQuestionIndex: Math.min(state.currentQuestionIndex + 1, state.questions.length - 1)
            })),

            prevQuestion: () => set((state) => ({
                currentQuestionIndex: Math.max(state.currentQuestionIndex - 1, 0)
            })),

            tickTimer: () => set((state) => {
                if (state.timeLeftSeconds <= 0) return { isActive: false, timeLeftSeconds: 0 };
                return { timeLeftSeconds: state.timeLeftSeconds - 1 };
            }),

            logViolation: () => set((state) => ({
                violationCount: state.violationCount + 1
            })),

            endSession: () => set({ isActive: false })
        }),
        {
            name: 'test-session-storage', // key in local storage
            storage: createJSONStorage(() => localStorage), // explicitly use localStorage
            onRehydrateStorage: () => (state) => {
                state?.setHasHydrated(true);
            },
            partialize: (state) => ({
                questions: state.questions, // Persist questions too so we don't need to refetch on F5
                answers: state.answers,
                currentQuestionIndex: state.currentQuestionIndex,
                timeLeftSeconds: state.timeLeftSeconds,
                isActive: state.isActive,
                violationCount: state.violationCount
            })
        }
    )
);
