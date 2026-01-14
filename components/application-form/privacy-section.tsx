"use client";

import { useFormContext } from "react-hook-form";
import { FormSection } from "./form-section";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ApplicationFormData } from "@/types/application-schema";
import { Scale } from "lucide-react"; // Using Scale (Balance) icon for legal/privacy

export function PrivacyAgreementSection() {
    const { register, watch, setValue, formState: { errors } } = useFormContext<ApplicationFormData>();

    // Checkbox component might need manual handling if it doesn't support {...register} nicely or is controlled
    // But let's assume standard shadcn checkbox usage which usually requires Controller or manual onChange

    // Simple native checkbox for robustness if Shadcn checkbox is complex locally
    // Or try to match style

    return (
        <FormSection
            title="10. 개인정보 수집 및 이용 동의 (Privacy)"
            description="채용 진행을 위한 개인정보 수집에 동의해주세요."
            icon={<Scale size={20} />}
        >
            <div className="space-y-4">
                <div className="bg-slate-50 p-4 rounded-lg border text-xs text-slate-500 h-32 overflow-y-auto">
                    <p className="font-bold mb-2">[개인정보 수집 및 이용 동의]</p>
                    <p>
                        1. 수집하는 개인정보 항목: 이름, 생년월일, 성별, 연락처, 이메일, 주소, 학력사항, 경력사항, 자격사항, 어학성적, 활동내역 등 입사지원서에 기재된 정보<br />
                        2. 수집 및 이용 목적: 입사 전형 진행, 지원자와의 원활한 의사소통, 채용 적합성 판단<br />
                        3. 보유 및 이용 기간: 채용 전형 종료 후 3년 (지원자 요청 시 즉시 파기)<br />
                        4. 동의 거부 권리: 귀하는 개인정보 수집 및 이용에 거부할 권리가 있으나, 동의하지 않을 경우 채용 전형 진행이 불가능할 수 있습니다.
                    </p>
                </div>

                <div className="flex items-center space-x-2">
                    <input
                        type="checkbox"
                        id="privacy_agreement"
                        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-600"
                        {...register("privacy_agreement" as any, { required: "개인정보 수집 및 이용에 동의해야 합니다" })}
                    />
                    <Label htmlFor="privacy_agreement" className="font-medium cursor-pointer">
                        개인정보 수집 및 이용에 동의합니다 (필수)
                    </Label>
                </div>
                {errors.privacy_agreement && (
                    <p className="text-sm text-red-500">{(errors.privacy_agreement as any).message}</p>
                )}
            </div>
        </FormSection>
    );
}
