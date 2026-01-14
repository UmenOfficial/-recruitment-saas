import Link from "next/link";
import { cn } from "@/lib/utils";

interface LogoProps {
    className?: string;
    isLink?: boolean;
}

export default function Logo({ className, isLink = true }: LogoProps) {
    // Reference Style: font-bold text-xl tracking-tighter hover:text-blue-600 transition-colors
    // Default text color: text-slate-900 (assuming dark text on light background)
    const baseStyle = "font-bold text-xl tracking-tighter hover:text-blue-600 transition-colors text-slate-900";

    if (isLink) {
        return (
            <Link href="/" className={cn(baseStyle, className)}>
                U.men.
            </Link>
        );
    }

    return (
        <span className={cn(baseStyle, "cursor-default", className)}>
            U.men.
        </span>
    );
}
