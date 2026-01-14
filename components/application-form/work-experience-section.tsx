"use client";

import { useFieldArray, useFormContext } from "react-hook-form";
import { FormSection } from "./form-section";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ApplicationFormData } from "@/types/application-schema";
import { Trash2, Plus, Briefcase } from "lucide-react";
import { useState, useEffect } from "react";

export function WorkExperienceSection() {
    const { register, control, formState: { errors }, setValue, watch } = useFormContext<ApplicationFormData>();
    const { fields, append, remove, replace } = useFieldArray({
        control,
        name: "work_experience",
    });

    const [isNewcomer, setIsNewcomer] = useState(false);

    // If user toggles newcomer, clear array or add initial empty row
    const handleNewcomerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const checked = e.target.checked;
        setIsNewcomer(checked);
        if (checked) {
            replace([]); // Clear all entries
        }
    };

    return (
        <FormSection
            title="3. 경력사항 (Work Experience)"
            description="주요 경력 사항을 기입해주세요."
            icon={<Briefcase size={20} />}
        >
            <div className="flex items-center space-x-2 mb-4">
                <input
                    type="checkbox"
                    id="newcomer_check"
                    checked={isNewcomer}
                    onChange={handleNewcomerChange}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="newcomer_check" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                    신입 (경력 없음)
                </label>
            </div>

            {!isNewcomer && (
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
                                {/* Company Name */}
                                <div className="space-y-2">
                                    <Label>회사명 (Company)</Label>
                                    <Input
                                        {...register(`work_experience.${index}.company_name`)}
                                        className={errors.work_experience?.[index]?.company_name ? "border-red-500" : ""}
                                    />
                                </div>

                                {/* Department */}
                                <div className="space-y-2">
                                    <Label>부서 (Department)</Label>
                                    <Input
                                        {...register(`work_experience.${index}.department`)}
                                    />
                                </div>

                                {/* Position */}
                                <div className="space-y-2">
                                    <Label>직급/직책 (Position)</Label>
                                    <Input
                                        {...register(`work_experience.${index}.position`)}
                                    />
                                </div>

                                {/* Salary */}
                                <div className="space-y-2">
                                    <Label>연봉 (Salary, Optional)</Label>
                                    <Input
                                        {...register(`work_experience.${index}.salary`)}
                                        placeholder="예: 5000만원"
                                    />
                                </div>

                                {/* Period Start */}
                                <div className="space-y-2">
                                    <Label>시작일 (Start Date)</Label>
                                    <Input
                                        type="month"
                                        {...register(`work_experience.${index}.period_start`)}
                                        className={errors.work_experience?.[index]?.period_start ? "border-red-500" : ""}
                                    />
                                </div>

                                {/* Period End */}
                                <div className="space-y-2">
                                    <Label>종료일 (End Date)</Label>
                                    <Input
                                        type="month"
                                        {...register(`work_experience.${index}.period_end`)}
                                    />
                                    <div className="flex items-center mt-1">
                                        <input type="checkbox" className="mr-2" {...register(`work_experience.${index}.is_current`)} />
                                        <span className="text-xs text-muted-foreground">재직중</span>
                                    </div>
                                </div>

                                {/* Unmapped Resignation Reason (Optional) - skipped in basic UI for brevity unless requested, added below just in case */}

                                {/* Details */}
                                <div className="md:col-span-2 space-y-2">
                                    <Label>담당 업무 (Details)</Label>
                                    <Textarea
                                        {...register(`work_experience.${index}.job_details`)}
                                        placeholder="담당했던 프로젝트와 성과를 기술해주세요."
                                        className="min-h-[100px]"
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
                            company_name: '',
                            department: '',
                            position: '',
                            period_start: '',
                            period_end: '',
                            job_details: ''
                        })}
                    >
                        <Plus className="w-4 h-4 mr-2" /> 경력 추가
                    </Button>
                </div>
            )}
        </FormSection>
    );
}
