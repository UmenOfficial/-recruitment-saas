import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetDescription,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ApplicationDetailDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    application: any; // Using any for flexibility with JSONB data
}

export default function ApplicationDetailDrawer({
    isOpen,
    onClose,
    application,
}: ApplicationDetailDrawerProps) {
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
    } = application;

    const created_at = rawCreatedAt || applied_at;

    // Helper to render sections safely
    const renderEducation = () => {
        const edu = application_data?.education;
        if (!Array.isArray(edu) || edu.length === 0) return <p className="text-gray-500">정보 없음</p>;

        return (
            <div className="space-y-4">
                {edu.map((item: any, idx: number) => (
                    <div key={idx} className="border-l-2 border-gray-200 pl-4">
                        <h4 className="font-medium text-gray-900">{item.school_name}</h4>
                        <p className="text-sm text-gray-600">
                            {item.major} | {item.status}
                        </p>
                        <p className="text-xs text-gray-400">
                            {item.admission_date} ~ {item.graduation_date}
                        </p>
                        {item.gpa && <p className="text-xs text-gray-500">학점: {item.gpa}</p>}
                    </div>
                ))}
            </div>
        );
    };

    const renderWork = () => {
        const work = application_data?.work_experience;
        if (!Array.isArray(work) || work.length === 0) return <p className="text-gray-500">정보 없음</p>;

        return (
            <div className="space-y-4">
                {work.map((item: any, idx: number) => (
                    <div key={idx} className="border-l-2 border-blue-200 pl-4">
                        <h4 className="font-medium text-gray-900">{item.company_name}</h4>
                        <div className="flex gap-2 items-center text-sm text-gray-600 mb-1">
                            <span>{item.department}</span>
                            <span>•</span>
                            <span>{item.position}</span>
                            {item.is_current && <Badge variant="outline" className="text-xs">재직중</Badge>}
                        </div>
                        <p className="text-xs text-gray-400 mb-2">
                            {item.period_start} ~ {item.period_end || '현재'}
                        </p>
                        <p className="text-sm text-gray-700 whitespace-pre-wrap">{item.job_details}</p>
                    </div>
                ))}
            </div>
        );
    };

    const renderSelfIntro = () => {
        const intro = application_data?.self_introduction;
        if (!intro) return <p className="text-gray-500">정보 없음</p>;

        // Type A: Single content
        if (intro.content) {
            return <p className="text-sm text-gray-700 whitespace-pre-wrap bg-gray-50 p-3 rounded-md">{intro.content}</p>;
        }

        // Type B: Questions & Answers
        if (Array.isArray(intro.items)) {
            return (
                <div className="space-y-6">
                    {intro.items.map((item: any, idx: number) => (
                        <div key={idx}>
                            <h4 className="text-sm font-semibold text-gray-900 mb-2">Q. {item.question_text}</h4>
                            <p className="text-sm text-gray-700 whitespace-pre-wrap bg-gray-50 p-3 rounded-md">{item.answer}</p>
                        </div>
                    ))}
                </div>
            );
        }

        return <p className="text-gray-500">형식을 알 수 없음</p>;
    };

    return (
        <Sheet open={isOpen} onOpenChange={onClose}>
            <SheetContent className="w-[800px] sm:w-[540px] overflow-y-auto">
                <SheetHeader className="mb-6">
                    <SheetTitle className="text-2xl">{name}</SheetTitle>
                    <SheetDescription>
                        지원일: {created_at ? format(new Date(created_at), 'PPP (eee)') : '날짜 없음'} <span className="mx-2">|</span> {email}
                    </SheetDescription>
                </SheetHeader>

                <ScrollArea className="h-[calc(100vh-120px)] pr-4">
                    <div className="space-y-8 pb-10">
                        {/* Summary Stats */}
                        <div className="flex gap-2">
                            <Badge variant="secondary">총 경력 {application_data?.work_experience?.length || 0}개</Badge>
                            <Badge variant="secondary">학력 {application_data?.education?.length || 0}개</Badge>
                        </div>

                        {/* Education */}
                        <section>
                            <h3 className="text-lg font-semibold border-b pb-2 mb-4 text-slate-800">학력 사항</h3>
                            {renderEducation()}
                        </section>

                        {/* Work Experience */}
                        <section>
                            <h3 className="text-lg font-semibold border-b pb-2 mb-4 text-slate-800">경력 사항</h3>
                            {renderWork()}
                        </section>

                        {/* Self Introduction */}
                        <section>
                            <h3 className="text-lg font-semibold border-b pb-2 mb-4 text-slate-800">자기소개서</h3>
                            {renderSelfIntro()}
                        </section>

                        {/* Attachments */}
                        <section>
                            <h3 className="text-lg font-semibold border-b pb-2 mb-4 text-slate-800">첨부 파일</h3>
                            <div className="flex gap-4">
                                {resume_url ? (
                                    <a href={resume_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-sm">
                                        📄 이력서 보기
                                    </a>
                                ) : <span className="text-gray-400 text-sm">이력서 없음</span>}

                                {portfolio_url ? (
                                    <a href={portfolio_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-sm">
                                        📂 포트폴리오 보기
                                    </a>
                                ) : <span className="text-gray-400 text-sm">포트폴리오 없음</span>}
                            </div>
                        </section>
                    </div>
                </ScrollArea>
            </SheetContent>
        </Sheet>
    );
}
