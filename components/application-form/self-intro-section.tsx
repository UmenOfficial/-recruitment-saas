"use client";

import { useFormContext, useFieldArray } from "react-hook-form";
import { FormSection } from "./form-section";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ApplicationFormData } from "@/types/application-schema";
import { FileText } from "lucide-react";

export interface SelfIntroConfig {
    type: 'TYPE_A' | 'TYPE_B';
    questions?: string[]; // For Type B
}

export function SelfIntroSection({ config = { type: 'TYPE_A' } }: { config?: SelfIntroConfig }) {
    const { register, control, watch } = useFormContext<ApplicationFormData>();

    // For Type B, we map the answers to an array of objects
    // Ideally, validtion schema should align. 
    // Schema defines `self_introduction` as union.

    return (
        <FormSection
            title="6. 자기소개 (Self Introduction)"
            description={config.type === 'TYPE_A' ? "자유롭게 본인을 소개해주세요." : "아래 질문에 답변해주세요."}
            icon={<FileText size={20} />}
        >
            <div className="space-y-6">
                {config.type === 'TYPE_A' && (
                    <div className="space-y-2">
                        <Label>자기소개서</Label>
                        <Textarea
                            {...register("self_introduction.content")}
                            placeholder="성장과정, 지원동기, 입사 후 포부 등을 자유롭게 기술해주세요."
                            className="min-h-[300px]"
                        />
                    </div>
                )}

                {config.type === 'TYPE_B' && config.questions?.map((question, index) => (
                    <div key={index} className="space-y-2">
                        <Label>{index + 1}. {question}</Label>
                        {/* Hidden input to store question text for context if needed, or just store answer */}
                        <input type="hidden" {...register(`self_introduction.items.${index}.question_text`)} value={question} />
                        <input type="hidden" {...register(`self_introduction.items.${index}.question_id`)} value={`q_${index}`} />

                        <Textarea
                            {...register(`self_introduction.items.${index}.answer`)}
                            placeholder="답변을 입력해주세요."
                            className="min-h-[150px]"
                        />
                    </div>
                ))}
            </div>
        </FormSection>
    );
}
