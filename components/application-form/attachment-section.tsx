"use client";

import { useFormContext } from "react-hook-form";
import { FormSection } from "./form-section";
import { Label } from "@/components/ui/label";
import { FileUpload } from "@/components/ui/file-upload";
import { ApplicationFormData } from "@/types/application-schema";
import { useState, useEffect } from "react";
import { Paperclip } from "lucide-react";

export function AttachmentSection() {
    const { register, setValue, watch, formState: { errors } } = useFormContext<ApplicationFormData>();

    // Watch attachments for display
    const attachments = watch("attachments") || [];

    // Initial filtering for visualization (mock split, in reality we store array of objects)
    // Our schema defines `attachments` as array of { type, file_url, file_name }.
    // We need to map the uploaded URLs to this structure.

    const handleResumeUpload = (urls: string[]) => {
        // Append to attachments array
        const current = watch("attachments") || [];
        const newItems = urls.map(url => ({
            type: 'Resume' as const,
            file_url: url,
            file_name: url.split('/').pop() || 'file'
        }));
        setValue("attachments", [...current, ...newItems]);
    };

    const handlePortfolioUpload = (urls: string[]) => {
        const current = watch("attachments") || [];
        const newItems = urls.map(url => ({
            type: 'Portfolio' as const,
            file_url: url,
            file_name: url.split('/').pop() || 'file'
        }));
        setValue("attachments", [...current, ...newItems]);
    };

    const handleRemove = (url: string) => {
        const current = watch("attachments") || [];
        setValue("attachments", current.filter(item => item.file_url !== url));
    };

    const resumeUrls = attachments.filter(a => a.type === 'Resume').map(a => a.file_url) || [];
    const pfUrls = attachments.filter(a => a.type === 'Portfolio').map(a => a.file_url) || [];

    return (
        <FormSection
            title="9. 첨부파일 (Attachments)"
            description="이력서 및 포트폴리오를 업로드해주세요. (PDF 권장)"
            icon={<Paperclip size={20} />}
        >
            <div className="space-y-6">
                <div className="space-y-2">
                    <Label>이력서 / 경력기술서 (Resume)</Label>
                    <FileUpload
                        bucketName="resumes"
                        onUploadComplete={handleResumeUpload}
                        existingUrls={resumeUrls}
                        onRemove={handleRemove}
                        accept={{ 'application/pdf': ['.pdf'], 'application/msword': ['.doc', '.docx'] }}
                    />
                    {/* Hidden input to ensure Zod validation if required, but currently attachment is optional in schema */}
                </div>

                <div className="space-y-2">
                    <Label>포트폴리오 (Portfolio)</Label>
                    <FileUpload
                        bucketName="portfolios"
                        onUploadComplete={handlePortfolioUpload}
                        existingUrls={pfUrls}
                        onRemove={handleRemove}
                        accept={{ 'application/pdf': ['.pdf'] }}
                    />
                    <div className="mt-2">
                        <Label className="text-xs text-muted-foreground mb-1 block">또는 URL 입력</Label>
                        <div className="flex gap-2">
                            <input
                                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                                placeholder="https://behance.net/..."
                                {...register("portfolio_url")}
                            />
                        </div>
                    </div>
                </div>
            </div>
        </FormSection>
    );
}
