"use client"

import * as React from "react"
import { Check } from "lucide-react"
import { cn } from "@/lib/utils"

const Checkbox = React.forwardRef<
    HTMLInputElement,
    React.InputHTMLAttributes<HTMLInputElement>
>(({ className, ...props }, ref) => {
    return (
        <div className="relative flex items-center">
            <input
                type="checkbox"
                className="peer h-4 w-4 shrink-0 rounded-sm border border-primary ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 appearance-none bg-white checked:bg-slate-900 checked:border-slate-900"
                ref={ref}
                {...props}
            />
            <Check className="absolute left-0 top-0 h-4 w-4 text-white opacity-0 peer-checked:opacity-100 pointer-events-none" />
        </div>
    )
})
Checkbox.displayName = "Checkbox"

export { Checkbox }
