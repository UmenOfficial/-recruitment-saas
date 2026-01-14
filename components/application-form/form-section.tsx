import { cn } from "@/lib/utils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ReactNode } from "react";

interface FormSectionProps {
    title: string;
    description?: string;
    children: ReactNode;
    className?: string;
    icon?: ReactNode;
}

export function FormSection({ title, description, children, className, icon }: FormSectionProps) {
    return (
        <Card className={cn("w-full mb-6 rounded-xl border shadow-sm bg-white overflow-hidden", className)}>
            <CardHeader className="pb-4 border-b bg-slate-50/50">
                <div className="flex items-center gap-3">
                    {icon && (
                        <div className="w-10 h-10 bg-white border rounded-lg flex items-center justify-center text-blue-600 shadow-sm shrink-0">
                            {icon}
                        </div>
                    )}
                    <div>
                        <CardTitle className="text-xl font-bold text-slate-800">{title}</CardTitle>
                        {description && <CardDescription className="mt-1 text-slate-500">{description}</CardDescription>}
                    </div>
                </div>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
                {children}
            </CardContent>
        </Card>
    );
}
