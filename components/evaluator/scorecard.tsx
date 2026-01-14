"use client";

import React, { useState, useEffect } from 'react';
import { UserX, AlertCircle } from 'lucide-react';
import { Switch } from '@/components/ui/switch'; // Assuming shadcn switch exists, or mock it
import { Label } from '@/components/ui/label';

interface ScoreItem {
    id: string;
    label: string;
    score: number;
    max: number;
}

interface ScorecardProps {
    initialScores: ScoreItem[];
    onUpdate: (scores: ScoreItem[], isNoShow: boolean) => void;
}

export function Scorecard({ initialScores, onUpdate }: ScorecardProps) {
    const [scores, setScores] = useState<ScoreItem[]>(initialScores);
    const [isNoShow, setIsNoShow] = useState(false);

    // Effect: Whenever state changes, notify parent
    useEffect(() => {
        onUpdate(scores, isNoShow);
    }, [scores, isNoShow, onUpdate]);

    const handleScoreChange = (id: string, val: number) => {
        if (isNoShow) return; // Block input if No-Show
        setScores(prev => prev.map(s => s.id === id ? { ...s, score: val } : s));
    };

    const toggleNoShow = (checked: boolean) => {
        setIsNoShow(checked);
        if (checked) {
            // Logic: If No-Show, reset scores to 0? Or keep them but ignore?
            // Requirement says: "allow 0 scores and set total_score = 0"
            // Visually setting them to 0 makes sense to indicate "No Score".
            setScores(prev => prev.map(s => ({ ...s, score: 0 })));
        }
    };

    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-6 p-4 bg-slate-50 rounded-lg border border-slate-200">
                <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-full ${isNoShow ? 'bg-red-100' : 'bg-slate-200'}`}>
                        <UserX className={`w-5 h-5 ${isNoShow ? 'text-red-600' : 'text-slate-500'}`} />
                    </div>
                    <div>
                        <Label htmlFor="no-show-mode" className="font-bold text-slate-900 block">
                            Candidate Absent (No-Show)
                        </Label>
                        <p className="text-xs text-slate-500">
                            Enable this if the candidate did not attend. Scores will be zeroed.
                        </p>
                    </div>
                </div>
                <Switch
                    id="no-show-mode"
                    checked={isNoShow}
                    onCheckedChange={toggleNoShow}
                />
            </div>

            <div className={`space-y-6 transition-all duration-300 ${isNoShow ? 'opacity-40 grayscale pointer-events-none' : ''}`}>
                {scores.map((item) => (
                    <div key={item.id}>
                        <div className="flex justify-between items-center mb-2">
                            <span className="font-medium text-slate-700">{item.label}</span>
                            <span className="font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                                {item.score} / {item.max}
                            </span>
                        </div>
                        <input
                            type="range"
                            min="0"
                            max={item.max}
                            value={item.score}
                            onChange={(e) => handleScoreChange(item.id, Number(e.target.value))}
                            className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                            disabled={isNoShow}
                        />
                    </div>
                ))}
            </div>

            {isNoShow && (
                <div className="mt-6 flex items-center gap-2 text-red-600 bg-red-50 p-3 rounded-lg text-sm font-medium animate-in fade-in">
                    <AlertCircle className="w-4 h-4" />
                    Evaluation will be submitted as "No-Show" (Total Score: 0).
                </div>
            )}
        </div>
    );
}
