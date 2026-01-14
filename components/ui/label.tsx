import { LabelHTMLAttributes, forwardRef } from "react"
import { cn } from "@/lib/utils"
// We don't have radix-ui installed yet probably, so using standard label
// If you want radix primitives, we should install them, but for now standard label is fine.

const Label = forwardRef<HTMLLabelElement, LabelHTMLAttributes<HTMLLabelElement>>(
    ({ className, ...props }, ref) => (
        <label
            ref={ref}
            className={cn(
                "text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
                className
            )}
            {...props}
        />
    )
)
Label.displayName = "Label"

export { Label }
