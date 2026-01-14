"use client";

import { useFormContext } from "react-hook-form";
import { FormSection } from "./form-section";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/select";
import { ApplicationFormData } from "@/types/application-schema";

import { User } from "lucide-react";

export function PersonalInfoSection() {
    const { register, formState: { errors } } = useFormContext<ApplicationFormData>();

    return (
        <FormSection
            title="1. 인적사항 (Personal Info)"
            description="지원자의 기본 정보를 입력해주세요. (이름, 생년월일, 성별을 제외한 연락처 정보는 암호화되어 저장됩니다)"
            icon={<User size={20} />}
        >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Name */}
                <div className="space-y-2">
                    <Label htmlFor="personal.name">이름 (Name) *</Label>
                    <Input
                        id="personal.name"
                        placeholder="홍길동"
                        {...register("personal.name")}
                        className={errors.personal?.name ? "border-red-500" : ""}
                    />
                    {errors.personal?.name && (
                        <p className="text-xs text-red-500">{errors.personal.name.message}</p>
                    )}
                </div>

                {/* DOB */}
                <div className="space-y-2">
                    <Label htmlFor="personal.dob">생년월일 (Date of Birth) *</Label>
                    <Input
                        id="personal.dob"
                        type="date"
                        {...register("personal.dob")}
                        className={errors.personal?.dob ? "border-red-500" : ""}
                    />
                    {errors.personal?.dob && (
                        <p className="text-xs text-red-500">{errors.personal.dob.message}</p>
                    )}
                </div>

                {/* Gender */}
                <div className="space-y-2">
                    <Label htmlFor="personal.gender">성별 (Gender) *</Label>
                    <NativeSelect
                        id="personal.gender"
                        {...register("personal.gender")}
                        className={errors.personal?.gender ? "border-red-500" : ""}
                    >
                        <option value="">선택해주세요</option>
                        <option value="Male">남성 (Male)</option>
                        <option value="Female">여성 (Female)</option>
                    </NativeSelect>
                    {errors.personal?.gender && (
                        <p className="text-xs text-red-500">{errors.personal.gender.message}</p>
                    )}
                </div>

                {/* Phone */}
                <div className="space-y-2">
                    <Label htmlFor="personal.phone">연락처 (Phone) *</Label>
                    <Input
                        id="personal.phone"
                        placeholder="010-1234-5678"
                        {...register("personal.phone")}
                        className={errors.personal?.phone ? "border-red-500" : ""}
                    />
                    {errors.personal?.phone && (
                        <p className="text-xs text-red-500">{errors.personal.phone.message}</p>
                    )}
                </div>

                {/* Email */}
                <div className="space-y-2">
                    <Label htmlFor="personal.email">이메일 (Email) *</Label>
                    <Input
                        id="personal.email"
                        type="email"
                        placeholder="example@email.com"
                        {...register("personal.email")}
                        className={errors.personal?.email ? "border-red-500" : ""}
                    />
                    {errors.personal?.email && (
                        <p className="text-xs text-red-500">{errors.personal.email.message}</p>
                    )}
                </div>

                {/* Address */}
                <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="personal.address">주소 (Address) *</Label>
                    <Input
                        id="personal.address"
                        placeholder="서울특별시 강남구..."
                        {...register("personal.address")}
                        className={errors.personal?.address ? "border-red-500" : ""}
                    />
                    {errors.personal?.address && (
                        <p className="text-xs text-red-500">{errors.personal.address.message}</p>
                    )}
                </div>

                {/* Photo URL (Optional) */}
                <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="personal.photo_url">사진 URL (Photo) </Label>
                    <Input
                        id="personal.photo_url"
                        placeholder="https://..."
                        {...register("personal.photo_url")}
                    />
                </div>
            </div>
        </FormSection>
    );
}
