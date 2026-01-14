"use client";

import { useFormContext } from "react-hook-form";
import { FormSection } from "./form-section";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { ApplicationFormData } from "@/types/application-schema";
import { Heart } from "lucide-react";

export function PreferencesSection() {
    const { register } = useFormContext<ApplicationFormData>();

    return (
        <FormSection
            title="8. 취업 우대 및 기타 (Preferences)"
            description="근무 조건 선호도를 입력해주세요."
            icon={<Heart size={20} />}
        >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                    <Label>고용 형태 (Job Type)</Label>
                    <NativeSelect {...register("preferences.job_type")}>
                        <option value="Full-time">정규직</option>
                        <option value="Contract">계약직</option>
                        <option value="Internship">인턴</option>
                        <option value="Freelance">프리랜서</option>
                    </NativeSelect>
                </div>

                <div className="space-y-2">
                    <Label>희망 근무지 (Location)</Label>
                    <Input {...register("preferences.desired_location")} placeholder="서울 강남구" />
                </div>

                <div className="space-y-2">
                    <Label>희망 연봉 (Salary)</Label>
                    <Input {...register("preferences.desired_salary")} placeholder="회사 내규에 따름" />
                    <div className="flex items-center mt-1">
                        <input type="checkbox" className="mr-2" {...register("preferences.is_negotiable")} />
                        <span className="text-xs text-muted-foreground">협의 가능</span>
                    </div>
                </div>
            </div>
        </FormSection>
    );
}
