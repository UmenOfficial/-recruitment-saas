"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ApplicationFormData } from "@/types/application-schema";
import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

interface ApplicationViewerProps {
    data: ApplicationFormData;
    blindMode?: boolean;
}

export function ApplicationViewer({ data, blindMode = false }: ApplicationViewerProps) {
    const [isBlind, setIsBlind] = useState(blindMode);

    const mask = (text: string | null | undefined) => {
        if (!text) return "-";
        if (!isBlind) return text;
        return "******** (Blind)";
    };

    const maskSchool = (text: string) => {
        if (!isBlind) return text;
        return "대학교 (블라인드)"; // Specific masking for school name
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center bg-gray-100 p-4 rounded-lg">
                <h2 className="text-xl font-bold">지원서 상세 (Viewer)</h2>
                <Button variant="outline" onClick={() => setIsBlind(!isBlind)} className="flex gap-2">
                    {isBlind ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    {isBlind ? "블라인드 모드 ON" : "일반 모드"}
                </Button>
            </div>

            {/* 1. Personal Info */}
            <Card>
                <CardHeader><CardTitle>1. 인적사항</CardTitle></CardHeader>
                <CardContent className="grid grid-cols-2 gap-4">
                    <div><span className="font-bold text-gray-500">이름:</span> {data.personal.name} </div>
                    <div><span className="font-bold text-gray-500">생년월일:</span> {data.personal.dob}</div>
                    <div><span className="font-bold text-gray-500">성별:</span> {data.personal.gender}</div>
                    {/* Contact info should be masked in blind mode ideally, or strictly controlled permission */}
                    <div><span className="font-bold text-gray-500">연락처:</span> {mask(data.personal.phone)}</div>
                    <div><span className="font-bold text-gray-500">이메일:</span> {mask(data.personal.email)}</div>
                    <div className="col-span-2"><span className="font-bold text-gray-500">주소:</span> {mask(data.personal.address)}</div>
                </CardContent>
            </Card>

            {/* 2. Education */}
            <Card>
                <CardHeader><CardTitle>2. 학력</CardTitle></CardHeader>
                <CardContent>
                    {data.education?.map((edu, idx) => (
                        <div key={idx} className="border-b py-3 last:border-0">
                            <div className="flex justify-between">
                                <h3 className="font-bold text-lg">{maskSchool(edu.school_name)}</h3>
                                <span className="text-sm text-gray-500">{edu.admission_date} ~ {edu.graduation_date}</span>
                            </div>
                            <div className="text-gray-600">{edu.major} | {edu.status} {edu.gpa && `| ${edu.gpa}`}</div>
                        </div>
                    ))}
                </CardContent>
            </Card>

            {/* 3. Work Experience */}
            <Card>
                <CardHeader><CardTitle>3. 경력</CardTitle></CardHeader>
                <CardContent>
                    {data.work_experience?.map((work, idx) => (
                        <div key={idx} className="border-b py-3 last:border-0">
                            <div className="flex justify-between">
                                <h3 className="font-bold text-lg">{work.company_name}</h3>
                                <span className="text-sm text-gray-500">{work.period_start} ~ {work.period_end || '재직중'}</span>
                            </div>
                            <div className="text-sm font-semibold">{work.department} | {work.position}</div>
                            <p className="mt-2 text-gray-700 whitespace-pre-wrap">{work.job_details}</p>
                        </div>
                    ))}
                </CardContent>
            </Card>

            {/* 4. Skills */}
            <Card>
                <CardHeader><CardTitle>4. 스킬/자격</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                    {data.skills?.certifications?.length! > 0 && (
                        <div>
                            <h4 className="font-bold mb-2">자격증</h4>
                            <ul className="list-disc pl-5">
                                {data.skills?.certifications?.map((c, i) => (
                                    <li key={i}>{c.name} ({c.issuer}) - {c.date}</li>
                                ))}
                            </ul>
                        </div>
                    )}
                    {data.skills?.languages?.length! > 0 && (
                        <div>
                            <h4 className="font-bold mb-2">어학</h4>
                            <ul className="list-disc pl-5">
                                {data.skills?.languages?.map((l, i) => (
                                    <li key={i}>{l.language} ({l.test_name}) : {l.score_level}</li>
                                ))}
                            </ul>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* 5. Self Intro */}
            <Card>
                <CardHeader><CardTitle>6. 자기소개</CardTitle></CardHeader>
                <CardContent>
                    {/* Handle Type A vs Type B */}
                    {/* Check if content exists (Type A) */}
                    {'content' in (data.self_introduction || {}) ? (
                        <p className="whitespace-pre-wrap">{(data.self_introduction as any).content}</p>
                    ) : (
                        <div className="space-y-4">
                            {(data.self_introduction as any)?.items?.map((item: any, idx: number) => (
                                <div key={idx}>
                                    <h4 className="font-bold mb-1">Q. {item.question_text || `질문 ${idx + 1}`}</h4>
                                    <p className="bg-gray-50 p-3 rounded">{item.answer}</p>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

        </div>
    );
}
