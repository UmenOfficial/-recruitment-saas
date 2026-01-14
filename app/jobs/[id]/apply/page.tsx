"use client";

import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { applicationFormSchema, ApplicationFormData } from "@/types/application-schema";
import { PersonalInfoSection } from "@/components/application-form/personal-info-section";
import { EducationSection } from "@/components/application-form/education-section";
import { WorkExperienceSection } from "@/components/application-form/work-experience-section";
import { SkillsSection } from "@/components/application-form/skills-section";
import { ActivitySection } from "@/components/application-form/activity-section";
import { SelfIntroSection } from "@/components/application-form/self-intro-section";
import { MilitarySection } from "@/components/application-form/military-section";
import { PreferencesSection } from "@/components/application-form/preferences-section";
import { AttachmentSection } from "@/components/application-form/attachment-section";
import { PrivacyAgreementSection } from "@/components/application-form/privacy-section";
import { Button } from "@/components/ui/button";
import { toast, Toaster } from "sonner";
import { useRouter, useParams } from "next/navigation";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";

function ApplicationFormContent() {
    const router = useRouter();
    const params = useParams();
    const postingId = params.id as string;

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [postingConfig, setPostingConfig] = useState<any>(null); // Config state
    const [isLoading, setIsLoading] = useState(true);

    // Fetch Posting Config
    useEffect(() => {
        async function fetchPosting() {
            if (!postingId) return;
            try {
                const { data, error } = await supabase
                    .from('postings')
                    .select('site_config, title')
                    .eq('id', postingId)
                    .single();

                if (error) throw error;

                // Assume site_config has the structure: { intro_type: 'TYPE_A' | 'TYPE_B', questions: [] }
                // Default to Type A if missing
                setPostingConfig((data as any)?.site_config || { intro_type: 'TYPE_A' });
            } catch (err) {
                console.error("Failed to load posting config", err);
                // Fallback default
                setPostingConfig({ intro_type: 'TYPE_A' });
            } finally {
                setIsLoading(false);
            }
        }
        fetchPosting();
    }, [postingId, supabase]);

    const form = useForm<ApplicationFormData>({
        resolver: zodResolver(applicationFormSchema) as any, // Cast to any to avoid generic mismatch
        defaultValues: {
            personal: { name: "", dob: "", gender: "Male", phone: "", email: "", address: "" },
            education: [],
            work_experience: [],
            skills: { certifications: [], languages: [], tech_skills: [] },
            activities: [],
            military: { veteran_status: false, military_status: "NotApplicable" },
            preferences: { job_type: "Full-time" },
        },
        mode: "onBlur",
    });

    const onSubmit = async (data: ApplicationFormData) => {
        setIsSubmitting(true);
        try {
            if (!postingId) throw new Error("Posting ID not found");

            const payload = {
                ...data,
                posting_id: postingId,
            };

            const response = await fetch("/api/applications/submit", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || "제출에 실패했습니다.");
            }

            toast.success("지원서가 성공적으로 제출되었습니다.");
            router.push("/applications/success");

        } catch (error: any) {
            console.error(error);
            toast.error(error.message || "오류가 발생했습니다.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const onError = (errors: any) => {
        console.error("Validation Errors:", errors);
        toast.error("입력 정보를 확인해주세요.");
    };

    if (isLoading) {
        return <div className="text-center py-20 text-slate-500"><Loader2 className="animate-spin mb-2 mx-auto" /> 양식을 불러오는 중...</div>;
    }

    // Construct config for SelfIntroSection
    const introConfig = {
        type: postingConfig?.intro_type || 'TYPE_A',
        questions: postingConfig?.questions || []
    };

    return (
        <FormProvider {...form}>
            <form onSubmit={form.handleSubmit(onSubmit, onError)} className="space-y-8">

                <PersonalInfoSection />
                <EducationSection />
                <WorkExperienceSection />
                <SkillsSection />
                <ActivitySection />
                <SelfIntroSection config={introConfig as any} />
                <MilitarySection />
                <PreferencesSection />
                <AttachmentSection />
                <PrivacyAgreementSection />

                <div className="flex justify-end pt-6 border-t">
                    <Button
                        type="button"
                        variant="secondary"
                        className="mr-auto"
                        onClick={() => {
                            form.setValue("personal.name", "홍길동");
                            form.setValue("personal.dob", "1990-01-01");
                            form.setValue("personal.gender", "Male");
                            form.setValue("personal.phone", "010-1234-5678");
                            form.setValue("personal.email", "hong@example.com");
                            form.setValue("personal.address", "서울시 강남구 테헤란로 123");

                            form.setValue("education", [{
                                school_name: "한국대학교",
                                major: "컴퓨터공학",
                                admission_date: "2009-03",
                                graduation_date: "2015-02",
                                status: "Graduated",
                                gpa: 4.0
                            }]);

                            form.setValue("work_experience", [{
                                company_name: "테크 스타트업",
                                department: "개발팀",
                                position: "선임 연구원",
                                period_start: "2015-03",
                                period_end: "2020-02",
                                is_current: false,
                                job_details: "풀스택 개발 및 아키텍처 설계 담당",
                                salary: "5000"
                            }]);

                            form.setValue("skills", {
                                certifications: [{ name: "정보처리기사", issuer: "한국산업인력공단", date: "2014-08", pass_status: "합격" }],
                                languages: [{ language: "English", score_level: "AL", date: "2023-01", test_name: "OPIc" }],
                                tech_skills: [{ tool_name: "React", proficiency_level: "Expert" }]
                            });

                            form.setValue("activities", [{
                                activity_name: "오픈소스 기여",
                                organization: "GitHub",
                                period_start: "2020-01",
                                description: "다수의 프론트엔드 라이브러리 기여"
                            }]);

                            // Handle Self Intro based on Type
                            if (postingConfig?.intro_type === 'TYPE_B' && postingConfig?.questions) {
                                const qItems = postingConfig.questions.map((q: any) => ({
                                    question_id: q.id,
                                    question_text: q.content,
                                    answer: "이것은 샘플 답변입니다. 열정을 가지고 프로젝트에 임하겠습니다."
                                }));
                                form.setValue("self_introduction", { items: qItems });
                            } else {
                                form.setValue("self_introduction", { content: "안녕하세요, 저는 열정적인 개발자 홍길동입니다. 사용자 경험을 최우선으로 생각하며..." });
                            }

                            form.setValue("military", { veteran_status: false, military_status: "Exempt" });
                            form.setValue("preferences", { job_type: "Full-time", desired_location: "서울", desired_salary: "6000", is_negotiable: true });

                            form.setValue("privacy_agreement", true);

                            toast.success("샘플 데이터가 입력되었습니다.");
                        }}
                    >
                        🪄 샘플 데이터 채우기
                    </Button>

                    <Button type="button" variant="outline" className="mr-2" onClick={() => router.back()}>
                        취소
                    </Button>
                    <Button type="submit" size="lg" disabled={isSubmitting}>
                        {isSubmitting ? <Loader2 className="animate-spin mr-2" /> : "지원하기"}
                    </Button>
                </div>
            </form>
        </FormProvider>
    );
}

export default function ApplicationPage({ params }: { params: Promise<{ id: string }> }) {
    return (
        <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
            <Toaster position="top-center" />

            {/* Header / Nav */}
            <div className="max-w-4xl mx-auto px-6 py-8">
                <Link href="/jobs" className="text-slate-500 hover:text-slate-800 flex items-center gap-2 mb-6 transition-colors">
                    <ArrowLeft size={18} /> 채용 공고 목록으로 돌아가기
                </Link>

                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-slate-900 mb-2">입사 지원서</h1>
                    <p className="text-slate-500">정확한 평가를 위해 모든 항목을 성실히 작성해주세요.</p>
                </div>

                <ApplicationFormContent />
            </div>
        </div>
    );
}
