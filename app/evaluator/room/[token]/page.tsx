"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle, CheckCircle, FileText, Save, Send, Users, ChevronLeft, ChevronRight, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ApplicationViewer } from '@/components/application-viewer/application-viewer';
import { ApplicationFormData } from '@/types/application-schema';

// Mock Data for Demo
const MOCK_APPLICATION_DATA: ApplicationFormData = {
    personal: {
        name: "김민수",
        email: "minsu.kim@example.com",
        phone: "010-1234-5678",
        dob: "1995-05-15",
        gender: "Male",
        address: "서울시 강남구 테헤란로 123",
        photo_url: ""
    },
    education: [
        {
            school_name: "한국대학교",
            major: "컴퓨터공학과",
            admission_date: "2014-03",
            graduation_date: "2020-02",
            status: "Graduated",
            gpa: 4.2
        }
    ],
    work_experience: [
        {
            company_name: "테크스타트업 A",
            department: "개발팀",
            position: "주니어 개발자",
            period_start: "2020-03",
            period_end: "2022-02",
            job_details: "React 기반 프론트엔드 개발 및 유지보수"
        }
    ],
    skills: {
        languages: [{ language: "영어", test_name: "TOEIC", score_level: "900", date: "2022-01" }],
        certifications: [{ name: "정보처리기사", issuer: "한국산업인력공단", date: "2019-08" }]
    },
    self_introduction: {
        content: "안녕하세요. 프론트엔드 개발자 김민수입니다. 사용자 경험을 최우선으로 생각하며..."
    },
    privacy_agreement: true
};

// Types
interface ScoreItem {
    id: string;
    label: string;
    score: number;
    max: number;
}

export default function EvaluationRoomPage({ params }: { params: { token: string } }) {
    const [hasAgreedNda, setHasAgreedNda] = useState(false); // Should fetch from DB
    const [activeTab, setActiveTab] = useState<'RESUME' | 'PORTFOLIO'>('RESUME');
    const [isBlindMode, setIsBlindMode] = useState(true);
    const [isRecused, setIsRecused] = useState(false);
    const [recusalReason, setRecusalReason] = useState("");
    const [privateNote, setPrivateNote] = useState("");
    const [comments, setComments] = useState("");
    const [scores, setScores] = useState<ScoreItem[]>([
        { id: 'job_fit', label: '직무 적합성 (Job Fit)', score: 0, max: 100 },
        { id: 'culture_fit', label: '조직 적합성 (Culture Fit)', score: 0, max: 100 },
        { id: 'growth', label: '성장 가능성 (Growth)', score: 0, max: 100 },
    ]);
    const [saveStatus, setSaveStatus] = useState<'SAVED' | 'SAVING' | 'UNSAVED'>('SAVED');

    // Simulate Auto-Save on change
    useEffect(() => {
        const timer = setTimeout(() => {
            if (saveStatus === 'UNSAVED') {
                setSaveStatus('SAVING');
                // Simulate API call
                setTimeout(() => setSaveStatus('SAVED'), 800);
            }
        }, 2000);
        return () => clearTimeout(timer);
    }, [scores, comments, privateNote, recusalReason, isRecused, saveStatus]);

    const handleScoreChange = (id: string, val: number) => {
        setScores(prev => prev.map(s => s.id === id ? { ...s, score: val } : s));
        setSaveStatus('UNSAVED');
    };

    if (!hasAgreedNda) {
        return (
            <NdaModal onAgree={() => setHasAgreedNda(true)} />
        );
    }

    return (
        <div className="flex h-screen bg-slate-100 flex-col overflow-hidden">
            {/* Header */}
            <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 shrink-0 z-10">
                <div className="flex items-center gap-4">
                    <div className="bg-slate-100 p-2 rounded-lg">
                        <Users className="w-5 h-5 text-slate-600" />
                    </div>
                    <div>
                        <h1 className="font-bold text-slate-800 text-lg">
                            {isBlindMode ? "Candidate KIM**" : "Kim Min-su"}
                        </h1>
                        <p className="text-xs text-slate-500">Senior Frontend Engineer • Document Stage</p>
                    </div>
                    {isBlindMode && (
                        <span className="bg-slate-800 text-white text-xs px-2 py-0.5 rounded-full flex items-center gap-1">
                            <EyeOff className="w-3 h-3" /> Blind Mode
                        </span>
                    )}
                </div>

                <div className="flex items-center gap-4">
                    <div className="flex flex-col items-end mr-4">
                        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Total Progress</span>
                        <div className="w-32 h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full bg-blue-600 w-1/3"></div>
                        </div>
                    </div>
                    <button
                        className="text-slate-500 hover:text-slate-800 text-sm font-medium mr-4"
                        disabled={saveStatus !== 'SAVED'}
                    >
                        {saveStatus === 'SAVING' ? 'Saving...' : saveStatus === 'UNSAVED' ? 'Unsaved changes' : 'All changes saved'}
                    </button>
                    <button className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-md font-medium text-sm transition-colors shadow-sm flex items-center gap-2">
                        <Send className="w-4 h-4" /> Submit Evaluation
                    </button>
                </div>
            </header>

            {/* Main Content (Split Screen) */}
            <div className="flex-1 flex overflow-hidden">

                {/* Left Panel: Viewer */}
                <div className="w-1/2 border-r border-slate-200 bg-slate-50 flex flex-col">
                    <div className="h-12 border-b border-slate-200 bg-white flex px-4 items-center gap-6">
                        <button
                            onClick={() => setActiveTab('RESUME')}
                            className={`text-sm font-medium h-full border-b-2 px-1 ${activeTab === 'RESUME' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                        >
                            지원서 (Application)
                        </button>
                        <button
                            onClick={() => setActiveTab('PORTFOLIO')}
                            className={`text-sm font-medium h-full border-b-2 px-1 ${activeTab === 'PORTFOLIO' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                        >
                            포트폴리오 (Portfolio)
                        </button>
                    </div>
                    <div className="flex-1 p-6 overflow-y-auto">
                        {activeTab === 'RESUME' ? (
                            <ApplicationViewer
                                data={MOCK_APPLICATION_DATA}
                                blindMode={isBlindMode}
                            />
                        ) : (
                            <div className="w-full h-full min-h-[800px] bg-white shadow-sm border border-slate-200 rounded-lg flex items-center justify-center text-slate-400">
                                <FileText className="w-16 h-16 mx-auto mb-4 opacity-50" />
                                <p>Portfolio Viewer (PDF)</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Panel: Scorecard */}
                <div className="w-1/2 bg-white flex flex-col overflow-y-auto">
                    <div className="p-8 max-w-2xl mx-auto w-full">

                        <div className="mb-8 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                            <div className="flex items-start gap-3">
                                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                                <div>
                                    <h3 className="text-sm font-bold text-amber-800 mb-1">Conflict of Interest?</h3>
                                    <p className="text-sm text-amber-700 mb-3">
                                        If you know this candidate personally or have a conflict of interest, please recuse yourself.
                                    </p>
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="checkbox"
                                            id="recuse"
                                            checked={isRecused}
                                            onChange={(e) => setIsRecused(e.target.checked)}
                                            className="w-4 h-4 text-amber-600 rounded focus:ring-amber-500 border-gray-300"
                                        />
                                        <label htmlFor="recuse" className="text-sm font-medium text-amber-900">I need to recuse myself (회피 신청)</label>
                                    </div>
                                </div>
                            </div>
                            {isRecused && (
                                <div className="mt-4 animate-in fade-in slide-in-from-top-2">
                                    <label className="block text-xs font-semibold text-amber-800 mb-1">Reason for Recusal *</label>
                                    <textarea
                                        value={recusalReason}
                                        onChange={(e) => {
                                            setRecusalReason(e.target.value);
                                            setSaveStatus('UNSAVED');
                                        }}
                                        className="w-full p-2 text-sm border border-amber-300 rounded focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white"
                                        placeholder="e.g., Immediate family member, Close friend..."
                                        rows={2}
                                    />
                                </div>
                            )}
                        </div>

                        <div className={`transition-opacity duration-200 ${isRecused ? 'opacity-40 pointer-events-none grayscale' : ''}`}>
                            <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
                                Evaluation Scorecard
                            </h2>

                            <div className="space-y-8 mb-10">
                                {scores.map((item) => (
                                    <div key={item.id} className="bg-slate-50 p-5 rounded-xl border border-slate-100">
                                        <div className="flex justify-between items-center mb-3">
                                            <label className="text-base font-semibold text-slate-800">{item.label}</label>
                                            <span className="text-sm font-bold text-blue-600">{item.score} / {item.max}</span>
                                        </div>
                                        <input
                                            type="range"
                                            min="0"
                                            max={item.max}
                                            value={item.score}
                                            onChange={(e) => handleScoreChange(item.id, Number(e.target.value))}
                                            className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                                        />
                                        <div className="flex justify-between text-xs text-slate-400 mt-2 font-medium">
                                            <span>Poor</span>
                                            <span>Excellent</span>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="mb-8">
                                <label className="block text-sm font-bold text-slate-800 mb-2">Overall Feedback (Required)</label>
                                <textarea
                                    value={comments}
                                    onChange={(e) => {
                                        setComments(e.target.value);
                                        setSaveStatus('UNSAVED');
                                    }}
                                    className="w-full p-4 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-700 min-h-[120px] resize-none"
                                    placeholder="Please provide detailed feedback on the candidate's strengths and weaknesses."
                                />
                            </div>

                            <div className="mb-8">
                                <label className="flex items-center gap-2 text-sm font-bold text-slate-600 mb-2">
                                    🔒 Private Note (Only for you)
                                    <span className="text-[10px] font-normal text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">Not shared with candidate</span>
                                </label>
                                <textarea
                                    value={privateNote}
                                    onChange={(e) => {
                                        setPrivateNote(e.target.value);
                                        setSaveStatus('UNSAVED');
                                    }}
                                    className="w-full p-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-300 text-sm text-slate-600 bg-yellow-50/50 min-h-[80px]"
                                    placeholder="Personal memo..."
                                />
                            </div>
                        </div>

                    </div>
                </div>
            </div>
        </div>
    );
}

// NDA Modal Component
function NdaModal({ onAgree }: { onAgree: () => void }) {
    return (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white max-w-lg w-full rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="p-8 text-center">
                    <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-6">
                        <CheckCircle className="w-8 h-8 text-blue-600" />
                    </div>
                    <h2 className="text-2xl font-bold text-slate-900 mb-3">Security Pledge (NDA)</h2>
                    <p className="text-slate-600 mb-8 leading-relaxed text-sm">
                        You are about to access <strong>Confidential Candidate Data</strong>.<br />
                        By proceeding, you explicitly agree to the following:
                    </p>

                    <ul className="text-left text-sm text-slate-600 space-y-3 bg-slate-50 p-6 rounded-xl mb-8 border border-slate-100">
                        <li className="flex gap-3">
                            <span className="text-slate-400 font-bold">•</span>
                            I will not share, copy, or distribute any candidate information.
                        </li>
                        <li className="flex gap-3">
                            <span className="text-slate-400 font-bold">•</span>
                            I will use this data solely for the purpose of evaluation.
                        </li>
                        <li className="flex gap-3">
                            <span className="text-slate-400 font-bold">•</span>
                            I understand that all my actions are audited.
                        </li>
                    </ul>

                    <button
                        onClick={onAgree}
                        className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-4 rounded-xl transition-all active:scale-[0.98]"
                    >
                        I Agree & Continue
                    </button>
                </div>
            </div>
        </div>
    )
}
