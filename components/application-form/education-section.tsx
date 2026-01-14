"use client";

import { useFieldArray, useFormContext } from "react-hook-form";
import { FormSection } from "./form-section";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { ApplicationFormData } from "@/types/application-schema";
import { Trash2, Plus, GraduationCap } from "lucide-react";

export function EducationSection() {
    const { register, control, formState: { errors } } = useFormContext<ApplicationFormData>();
    const { fields, append, remove } = useFieldArray({
        control,
        name: "education",
    });

    return (
        <FormSection
            title="2. 학력 (Education)"
            description="최종 학력부터 역순으로 기입해주세요."
            icon={<GraduationCap size={20} />}
        >
            <div className="space-y-6">
                {fields.map((item, index) => (
                    <div key={item.id} className="relative p-4 border rounded-md bg-gray-50/50">
                        <div className="flex justify-end mb-2">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => remove(index)}
                                className="text-red-500 hover:text-red-700 hover:bg-red-50 h-8 px-2"
                                type="button"
                            >
                                <Trash2 className="w-4 h-4 mr-1" /> 삭제
                            </Button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* School Name */}
                            <div className="space-y-2">
                                <Label>학교명 (School Name) *</Label>
                                <Input
                                    placeholder="oo대학교"
                                    {...register(`education.${index}.school_name`)}
                                    className={errors.education?.[index]?.school_name ? "border-red-500" : ""}
                                />
                            </div>

                            {/* Major */}
                            <div className="space-y-2">
                                <Label>전공 (Major) *</Label>
                                <Input
                                    placeholder="컴퓨터공학과"
                                    {...register(`education.${index}.major`)}
                                    className={errors.education?.[index]?.major ? "border-red-500" : ""}
                                />
                            </div>

                            {/* Admission Date */}
                            <div className="space-y-2">
                                <Label>입학년월 (Admission) *</Label>
                                <Input
                                    type="month"
                                    {...register(`education.${index}.admission_date`)}
                                    className={errors.education?.[index]?.admission_date ? "border-red-500" : ""}
                                />
                            </div>

                            {/* Graduation Date */}
                            <div className="space-y-2">
                                <Label>졸업년월 (Graduation) *</Label>
                                <Input
                                    type="month"
                                    {...register(`education.${index}.graduation_date`)}
                                    className={errors.education?.[index]?.graduation_date ? "border-red-500" : ""}
                                />
                            </div>

                            {/* Status */}
                            <div className="space-y-2">
                                <Label>상태 (Status) *</Label>
                                <NativeSelect
                                    {...register(`education.${index}.status`)}
                                    className={errors.education?.[index]?.status ? "border-red-500" : ""}
                                >
                                    <option value="">선택해주세요</option>
                                    <option value="Graduated">졸업 (Graduated)</option>
                                    <option value="Attending">재학 (Attending)</option>
                                    <option value="Leave">휴학 (Leave)</option>
                                    <option value="Dropout">중퇴 (Dropout)</option>
                                </NativeSelect>
                            </div>

                            {/* GPA */}
                            <div className="space-y-2">
                                <Label>학점 (GPA)</Label>
                                <Input
                                    step="0.01"
                                    type="number"
                                    placeholder="4.0"
                                    {...register(`education.${index}.gpa`)}
                                />
                            </div>
                        </div>
                    </div>
                ))}

                <Button
                    type="button"
                    variant="outline"
                    className="w-full border-dashed"
                    onClick={() => append({
                        school_name: '',
                        major: '',
                        admission_date: '',
                        graduation_date: '',
                        status: 'Graduated', // Default might be unsafe if user forgets, but nice UX
                        // However, schema requires explicit selection if empty. 'Graduated' is a valid Enum though.
                        // Let's leave empty string in schema as default if we want force selection, 
                        // but Zod enum validation might fail if init with empty. 
                        // Zod schema: status is enum. So let's provide a valid default or empty string if "Select" option is default.
                        // In UI, we have <option value="">. So let's append with empty string casted as any to match type or just TS ignore.
                        // Safest: set default to "Graduated" or empty and rely on validation.
                    } as any)}
                >
                    <Plus className="w-4 h-4 mr-2" /> 학력 추가
                </Button>
            </div>
        </FormSection>
    );
}
