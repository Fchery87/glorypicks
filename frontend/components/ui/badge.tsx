import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-sm border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-accent-primary/50 focus:ring-offset-2 focus:ring-offset-bg-primary",
  {
    variants: {
      variant: {
        default: "border-transparent bg-text-primary text-bg-primary",
        secondary: "border-transparent bg-bg-tertiary text-text-primary",
        outline: "border-border-default text-text-primary",
        success: "border-transparent bg-accent-bullish/10 text-accent-bullish border-accent-bullish/30",
        warning: "border-transparent bg-warning/10 text-warning border-warning/30",
        danger: "border-transparent bg-error/10 text-error border-error/30",
        signal: "border-transparent text-sm font-bold px-4 py-2",
      },
      size: {
        default: "",
        sm: "px-2 py-0.5 text-[10px]",
        lg: "px-4 py-1.5 text-sm",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, size, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant, size }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
