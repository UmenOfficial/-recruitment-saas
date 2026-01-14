import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { ArrowLeft, Download, ExternalLink } from "lucide-react";

interface ApplicationDetailProps {
    application: any;
    onBack: () => void;
    onStatusUpdate?: (id: string, status: string) => void;
    isModal?: boolean;
}

export default function ApplicationDetail({
    application,
    onBack,
    onStatusUpdate,
    isModal = false
}: ApplicationDetailProps) {
    if (!application) return null;

    const {
        name,
        email,
        created_at: rawCreatedAt,
        applied_at,
        application_data,
        custom_answers,
        resume_url,
        portfolio_url,
        status
    } = application;

    const created_at = rawCreatedAt || applied_at;

    // Helper to render sections
    const renderEducation = () => {
        const edu = application_data?.education;
        if (!Array.isArray(edu) || edu.length === 0) return <p className="text-gray-500 py-4">등록된 학력 정보가 없습니다.</p>;

        return (
            <div className="space-y-6">
                {edu.map((item: any, idx: number) => (
                    <div key={idx} className="flex flex-col sm:flex-row gap-4 sm:gap-8 p-4 bg-slate-50 rounded-lg border border-slate-100">
                        <div className="min-w-[120px]">
                            <p className="text-sm font-semibold text-slate-700">{item.admission_date}</p>
                            <p className="text-xs text-slate-500">~ {item.graduation_date}</p>
                            <Badge variant="outline" className="mt-2 text-xs font-normal text-slate-500">{item.status}</Badge>
                        </div>
                        <div className="flex-1">
                            <h4 className="font-bold text-slate-900 text-lg mb-1">{item.school_name}</h4>
                            <div className="flex items-center gap-2 text-slate-600">
                                <span className="font-medium">{item.major}</span>
                                {item.gpa && <span className="text-sm bg-white px-2 py-0.5 rounded border">학점: {item.gpa}</span>}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        );
    };

    const renderWork = () => {
        const work = application_data?.work_experience;
        if (!Array.isArray(work) || work.length === 0) return <p className="text-gray-500 py-4">등록된 경력 정보가 없습니다.</p>;

        return (
            <div className="space-y-8">
                {work.map((item: any, idx: number) => (
                    <div key={idx} className="relative pl-8 border-l-2 border-slate-200">
                        <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-slate-300 border-2 border-white"></div>

                        <div className="mb-2">
                            <h4 className="text-xl font-bold text-slate-900 inline-block mr-3">{item.company_name}</h4>
                            {item.is_current && <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-200 mb-1">재직중</Badge>}
                        </div>

                        <div className="flex flex-wrap gap-4 text-sm text-slate-600 mb-4">
                            <div className="flex items-center gap-1">
                                <span className="font-medium">부서/직위:</span>
                                <span>{item.department} {item.position && ` / ${item.position}`}</span>
                            </div>
                            <div className="flex items-center gap-1">
                                <span className="font-medium">근무 기간:</span>
                                <span className="font-mono">{item.period_start} ~ {item.period_end || '현재'}</span>
                            </div>
                        </div>

                        <div className="bg-slate-50 p-4 rounded-lg border border-slate-100 text-slate-700 whitespace-pre-wrap leading-relaxed">
                            {item.job_details}
                        </div>
                    </div>
                ))}
            </div>
        );
    };

    const renderSelfIntro = () => {
        const intro = application_data?.self_introduction;
        if (!intro) return <p className="text-gray-500 py-4">등록된 자기소개서가 없습니다.</p>;

        // Type A: Single content
        if (intro.content) {
            return (
                <div className="bg-slate-50 p-6 rounded-xl border border-slate-100">
                    <p className="text-slate-800 whitespace-pre-wrap leading-relaxed text-lg">{intro.content}</p>
                </div>
            );
        }

        // Type B: Questions & Answers
        if (Array.isArray(intro.items)) {
            return (
                <div className="space-y-8">
                    {intro.items.map((item: any, idx: number) => (
                        <div key={idx} className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                            <div className="bg-slate-50 px-6 py-4 border-b border-slate-100">
                                <h4 className="font-semibold text-slate-900 text-lg flex gap-2">
                                    <span className="text-blue-600">Q{idx + 1}.</span>
                                    {item.question_text}
                                </h4>
                            </div>
                            <div className="p-6">
                                <p className="text-slate-700 whitespace-pre-wrap leading-relaxed">{item.answer}</p>
                            </div>
                        </div>
                    ))}
                </div>
            );
        }

        return <p className="text-gray-500">형식을 알 수 없음</p>;
    };

    return (
        <div className={`w-full mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500 ${isModal ? 'pb-0' : 'pb-20 max-w-5xl'}`}>
            {/* Header Navigation - Hide if isModal */}
            {!isModal && (
                <div className="mb-6 flex items-center justify-between">
                    <Button variant="ghost" onClick={onBack} className="text-slate-500 hover:text-slate-900 -ml-4">
                        <ArrowLeft className="mr-2 h-4 w-4" /> 목록으로 돌아가기
                    </Button>
                    <div className="flex gap-2">
                        {/* Placeholder for status actions if needed here */}
                        <Badge variant="outline" className="text-base px-3 py-1 bg-white">
                            {status}
                        </Badge>
                    </div>
                </div>
            )}

            {/* Main Content Card */}
            <div className={`bg-white overflow-hidden ${isModal ? 'rounded-none shadow-none border-0' : 'rounded-2xl shadow-sm border border-slate-200'}`}>
                {/* Profile Header */}
                <div className="bg-slate-900 text-white p-8 sm:p-10">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div>
                            <h1 className="text-3xl font-bold mb-2">{name}</h1>
                            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6 text-slate-300 text-sm">
                                <span>{email}</span>
                                <span className="hidden sm:inline">|</span>
                                <span>지원일: {created_at ? format(new Date(created_at), 'PPP (eee)') : '날짜 없음'}</span>
                            </div>
                        </div>
                        <div className="flex gap-3">
                            {resume_url && (
                                <a href={resume_url} target="_blank" rel="noopener noreferrer">
                                    <Button variant="outline" className="bg-white/10 border-white/20 text-white hover:bg-white/20 hover:text-white border-0">
                                        <Download className="mr-2 h-4 w-4" /> 이력서
                                    </Button>
                                </a>
                            )}
                            {portfolio_url && (
                                <a href={portfolio_url} target="_blank" rel="noopener noreferrer">
                                    <Button variant="outline" className="bg-white/10 border-white/20 text-white hover:bg-white/20 hover:text-white border-0">
                                        <ExternalLink className="mr-2 h-4 w-4" /> 포트폴리오
                                    </Button>
                                </a>
                            )}
                        </div>
                    </div>
                </div>

                <div className="p-8 sm:p-12 space-y-12">
                    {/* Summary */}
                    <div className="flex gap-4 p-4 bg-slate-50 rounded-lg border border-slate-100">
                        <div className="flex-1 text-center border-r border-slate-200 last:border-0">
                            <span className="block text-slate-500 text-xs uppercase tracking-wider mb-1">총 경력</span>
                            <span className="text-xl font-bold text-slate-900">{application_data?.work_experience?.length || 0} 개</span>
                        </div>
                        <div className="flex-1 text-center border-r border-slate-200 last:border-0">
                            <span className="block text-slate-500 text-xs uppercase tracking-wider mb-1">학력</span>
                            <span className="text-xl font-bold text-slate-900">{application_data?.education?.length || 0} 건</span>
                        </div>
                    </div>

                    {/* Education */}
                    <section>
                        <h3 className="text-2xl font-bold text-slate-900 mb-6 flex items-center gap-2">
                            📚 학력 사항
                        </h3>
                        {renderEducation()}
                    </section>

                    <hr className="border-slate-100" />

                    {/* Work Experience */}
                    <section>
                        <h3 className="text-2xl font-bold text-slate-900 mb-6 flex items-center gap-2">
                            💼 경력 사항
                        </h3>
                        {renderWork()}
                    </section>

                    <hr className="border-slate-100" />

                    {/* Self Introduction */}
                    <section>
                        <h3 className="text-2xl font-bold text-slate-900 mb-6 flex items-center gap-2">
                            ✍️ 자기소개서
                        </h3>
                        {renderSelfIntro()}
                    </section>
                </div>
            </div>
        </div>
    );
}
