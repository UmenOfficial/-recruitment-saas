"use client";

import { useFieldArray, useFormContext } from "react-hook-form";
import { FormSection } from "./form-section";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { ApplicationFormData } from "@/types/application-schema";
import { Trash2, Plus, Code } from "lucide-react";

export function SkillsSection() {
    const { register, control, formState: { errors } } = useFormContext<ApplicationFormData>();

    // Certifications
    const { fields: certFields, append: appendCert, remove: removeCert } = useFieldArray({
        control,
        name: "skills.certifications",
    });

    // Languages
    const { fields: langFields, append: appendLang, remove: removeLang } = useFieldArray({
        control,
        name: "skills.languages",
    });

    // Tech Skills
    const { fields: techFields, append: appendTech, remove: removeTech } = useFieldArray({
        control,
        name: "skills.tech_skills",
    });

    return (
        <FormSection
            title="4. 보유 기술 및 자격 (Skills & Qualifications)"
            description="자격증, 어학능력, 보유 기술을 입력해주세요."
            icon={<Code size={20} />}
        >
            {/* 1. Certifications */}
            <div className="mb-6">
                <h4 className="text-sm font-semibold mb-3">자격증 (Certifications)</h4>
                <div className="space-y-3">
                    {certFields.map((item, index) => (
                        <div key={item.id} className="flex gap-2 items-end">
                            <div className="flex-1 space-y-1">
                                {index === 0 && <Label className="text-xs">자격증명</Label>}
                                <Input placeholder="정보처리기사" {...register(`skills.certifications.${index}.name`)} />
                            </div>
                            <div className="flex-1 space-y-1">
                                {index === 0 && <Label className="text-xs">발행처</Label>}
                                <Input placeholder="한국산업인력공단" {...register(`skills.certifications.${index}.issuer`)} />
                            </div>
                            <div className="w-32 space-y-1">
                                {index === 0 && <Label className="text-xs">취득일</Label>}
                                <Input type="date" {...register(`skills.certifications.${index}.date`)} />
                            </div>
                            <Button variant="ghost" size="icon" onClick={() => removeCert(index)} className="mb-0.5 text-red-500">
                                <Trash2 className="w-4 h-4" />
                            </Button>
                        </div>
                    ))}
                    <Button type="button" variant="outline" size="sm" onClick={() => appendCert({ name: '', issuer: '', date: '' })} className="w-full text-xs">
                        + 자격증 추가
                    </Button>
                </div>
            </div>

            <hr className="my-4 border-gray-100" />

            {/* 2. Languages */}
            <div className="mb-6">
                <h4 className="text-sm font-semibold mb-3">어학 (Languages)</h4>
                <div className="space-y-3">
                    {langFields.map((item, index) => (
                        <div key={item.id} className="flex gap-2 items-end">
                            <div className="flex-1 space-y-1">
                                {index === 0 && <Label className="text-xs">언어</Label>}
                                <Input placeholder="영어" {...register(`skills.languages.${index}.language`)} />
                            </div>
                            <div className="flex-1 space-y-1">
                                {index === 0 && <Label className="text-xs">시험명</Label>}
                                <Input placeholder="TOEIC" {...register(`skills.languages.${index}.test_name`)} />
                            </div>
                            <div className="w-24 space-y-1">
                                {index === 0 && <Label className="text-xs">점수/급수</Label>}
                                <Input placeholder="900" {...register(`skills.languages.${index}.score_level`)} />
                            </div>
                            <Button variant="ghost" size="icon" onClick={() => removeLang(index)} className="mb-0.5 text-red-500">
                                <Trash2 className="w-4 h-4" />
                            </Button>
                        </div>
                    ))}
                    <Button type="button" variant="outline" size="sm" onClick={() => appendLang({ language: '', score_level: '' })} className="w-full text-xs">
                        + 어학 추가
                    </Button>
                </div>
            </div>

            <hr className="my-4 border-gray-100" />

            {/* 3. Tech Skills */}
            <div>
                <h4 className="text-sm font-semibold mb-3">기술 스택 (Tech Skills)</h4>
                <div className="space-y-3">
                    {techFields.map((item, index) => (
                        <div key={item.id} className="flex gap-2 items-end">
                            <div className="flex-1 space-y-1">
                                {index === 0 && <Label className="text-xs">기술명</Label>}
                                <Input placeholder="React" {...register(`skills.tech_skills.${index}.tool_name`)} />
                            </div>
                            <div className="w-40 space-y-1">
                                {index === 0 && <Label className="text-xs">숙련도</Label>}
                                <NativeSelect {...register(`skills.tech_skills.${index}.proficiency_level`)}>
                                    <option value="Beginner">Beginner</option>
                                    <option value="Intermediate">Intermediate</option>
                                    <option value="Advanced">Advanced</option>
                                    <option value="Expert">Expert</option>
                                </NativeSelect>
                            </div>
                            <Button variant="ghost" size="icon" onClick={() => removeTech(index)} className="mb-0.5 text-red-500">
                                <Trash2 className="w-4 h-4" />
                            </Button>
                        </div>
                    ))}
                    <Button type="button" variant="outline" size="sm" onClick={() => appendTech({ tool_name: '', proficiency_level: 'Intermediate' })} className="w-full text-xs">
                        + 기술 추가
                    </Button>
                </div>
            </div>

        </FormSection>
    );
}
