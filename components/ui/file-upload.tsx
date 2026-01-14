"use client";

import { useDropzone } from "react-dropzone";
import { UploadCloud, File, X, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "./button";
import { supabase } from "@/lib/supabase";
import { useState } from "react";
import { toast } from "sonner";

interface FileUploadProps {
    onUploadComplete: (urls: string[]) => void;
    bucketName: 'resumes' | 'portfolios'; // Restrict buckets
    accept?: Record<string, string[]>;
    maxFiles?: number;
    existingUrls?: string[];
    onRemove?: (url: string) => void;
    className?: string;
}

export function FileUpload({
    onUploadComplete,
    bucketName,
    accept,
    maxFiles = 1,
    existingUrls = [],
    onRemove,
    className
}: FileUploadProps) {
    const [isUploading, setIsUploading] = useState(false);
    // const supabase = createClientComponentClient(); // Removed

    const onDrop = async (acceptedFiles: File[]) => {
        if (acceptedFiles.length === 0) return;

        setIsUploading(true);
        const uploadedUrls: string[] = [];

        try {
            for (const file of acceptedFiles) {
                // Generate a unique path: timestamp-random-filename
                const fileExt = file.name.split('.').pop();
                const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
                const filePath = `${fileName}`;

                const { error: uploadError } = await supabase.storage
                    .from(bucketName)
                    .upload(filePath, file);

                if (uploadError) {
                    throw uploadError;
                }

                const { data: { publicUrl } } = supabase.storage
                    .from(bucketName)
                    .getPublicUrl(filePath);

                uploadedUrls.push(publicUrl);
            }

            onUploadComplete(uploadedUrls);
            toast.success("파일 업로드 성공");

        } catch (error: any) {
            console.error("Upload Error:", error);
            toast.error(`파일 업로드 실패: ${error.message || "알 수 없는 오류"}`);
        } finally {
            setIsUploading(false);
        }
    };

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept,
        maxFiles,
        disabled: isUploading,
    });

    return (
        <div className={cn("w-full", className)}>
            <div
                {...getRootProps()}
                className={cn(
                    "border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center cursor-pointer transition-colors relative",
                    isDragActive ? "border-primary bg-primary/5" : "border-gray-200 hover:border-primary/50",
                    isUploading ? "opacity-50 cursor-not-allowed" : "",
                    "h-32"
                )}
            >
                <input {...getInputProps()} />
                {isUploading ? (
                    <Loader2 className="w-8 h-8 text-primary animate-spin mb-2" />
                ) : (
                    <UploadCloud className="w-8 h-8 text-gray-400 mb-2" />
                )}
                <p className="text-sm text-gray-500 text-center">
                    {isUploading ? (
                        "업로드 중..."
                    ) : isDragActive ? (
                        "지금 놓으세요"
                    ) : (
                        <>
                            <span className="font-semibold text-primary">클릭하여 업로드</span> 하거나 파일을 여기로 드래그하세요
                        </>
                    )}
                </p>
            </div>

            {existingUrls.length > 0 && (
                <ul className="mt-4 space-y-2">
                    {existingUrls.map((url, idx) => (
                        <li key={idx} className="flex items-center justify-between p-2 bg-gray-50 rounded-md border text-sm">
                            <div className="flex items-center">
                                <File className="w-4 h-4 mr-2 text-blue-500" />
                                <a href={url} target="_blank" rel="noopener noreferrer" className="truncate max-w-[200px] hover:underline text-blue-600">
                                    {url.split('/').pop()}
                                </a>
                            </div>
                            {onRemove && (
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => onRemove(url)}
                                    className="h-6 w-6 text-gray-500 hover:text-red-500"
                                    type="button"
                                >
                                    <X className="w-4 h-4" />
                                </Button>
                            )}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
