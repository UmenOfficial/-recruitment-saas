"use client";

import { useFormContext } from "react-hook-form";
import { FormSection } from "./form-section";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/select";
import { ApplicationFormData } from "@/types/application-schema";
import { Medal } from "lucide-react";

export function MilitarySection() {
    const { register, watch } = useFormContext<ApplicationFormData>();

    const gender = watch("personal.gender");

    // Optional: Auto-hide if Female (depending on config, but standard kr forms often show it anyway or auto-select NA)
    // We'll leave it visible but defaulted.

    return (
        <FormSection
            title="7. 병역 (Military Service)"
            description="병역 사항을 선택해주세요."
            icon={<Medal size={20} />}
        >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label>병역 구분</Label>
                    <NativeSelect {...register("military.military_status")}>
                        <option value="NotApplicable">해당없음 (비대상)</option>
                        <option value="Served">군필 (기타 복무 포함)</option>
                        <option value="Exempt">면제</option>
                        <option value="Unfinished">미필</option>
                    </NativeSelect>
                </div>

                {/* We can add Rank/Branch fields here if needed for 'Served' status */}
            </div>
        </FormSection>
    );
}
