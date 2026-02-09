import * as React from "react";
import { cn } from "@/lib/utils";

export interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: number;
  max?: number;
  variant?: "default" | "bullish" | "bearish" | "neutral";
}

const Progress = React.forwardRef<HTMLDivElement, ProgressProps>(
  ({ className, value = 0, max = 100, variant = "default", ...props }, ref) => {
    const percentage = Math.min(Math.max((value / max) * 100, 0), 100);
    
    const variantStyles = {
      default: "bg-text-primary",
      bullish: "bg-accent-bullish",
      bearish: "bg-accent-bearish",
      neutral: "bg-accent-neutral",
    };
    
    return (
      <div
        ref={ref}
        className={cn(
          "relative h-2 w-full overflow-hidden rounded-sm bg-bg-secondary",
          className
        )}
        {...props}
      >
        <div
          className={cn("h-full transition-all duration-500 ease-out", variantStyles[variant])}
          style={{ width: `${percentage}%` }}
        />
      </div>
    );
  }
);
Progress.displayName = "Progress";

export { Progress };
