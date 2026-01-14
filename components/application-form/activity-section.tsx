"use client";

import { useFieldArray, useFormContext } from "react-hook-form";
import { FormSection } from "./form-section";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ApplicationFormData } from "@/types/application-schema";
import { Trash2, Plus, Trophy } from "lucide-react";

export function ActivitySection() {
    const { register, control, formState: { errors } } = useFormContext<ApplicationFormData>();
    const { fields, append, remove } = useFieldArray({
        control,
        name: "activities",
    });

    return (
        <FormSection
            title="5. 대외활동 (Activities)"
            description="인턴, 봉사활동, 수상경력 등을 기입해주세요."
            icon={<Trophy size={20} />}
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
                            <div className="space-y-2">
                                <Label>활동명 (Activity Name)</Label>
                                <Input {...register(`activities.${index}.activity_name`)} />
                            </div>

                            <div className="space-y-2">
                                <Label>기관/단체 (Organization)</Label>
                                <Input {...register(`activities.${index}.organization`)} />
                            </div>

                            <div className="space-y-2">
                                <Label>시작일</Label>
                                <Input type="month" {...register(`activities.${index}.period_start`)} />
                            </div>

                            <div className="space-y-2">
                                <Label>종료일</Label>
                                <Input type="month" {...register(`activities.${index}.period_end`)} />
                            </div>

                            <div className="col-span-1 md:col-span-2 space-y-2">
                                <Label>활동 내용 (Description)</Label>
                                <Textarea {...register(`activities.${index}.description`)} placeholder="구체적인 활동 내용을 적어주세요." className="min-h-[80px]" />
                            </div>
                        </div>
                    </div>
                ))}

                <Button
                    type="button"
                    variant="outline"
                    className="w-full border-dashed"
                    onClick={() => append({
                        activity_name: '',
                        organization: '',
                        period_start: '',
                    })}
                >
                    <Plus className="w-4 h-4 mr-2" /> 활동 추가
                </Button>
            </div>
        </FormSection>
    );
}
