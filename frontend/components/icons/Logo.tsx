import React from "react";
import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
  showText?: boolean;
}

const sizeMap = {
  sm: { container: 28, stroke: 2 },
  md: { container: 36, stroke: 2.5 },
  lg: { container: 48, stroke: 3 },
  xl: { container: 64, stroke: 4 },
};

export function Logo({ className, size = "md", showText = true }: LogoProps) {
  const { container, stroke } = sizeMap[size];

  return (
    <div className={cn("flex items-center gap-3", className)}>
      {/* Logo Mark - Precision Crosshair Design */}
      <svg
        width={container}
        height={container}
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="flex-shrink-0"
      >
        {/* Outer circle - subtle */}
        <circle
          cx="24"
          cy="24"
          r="22"
          stroke="currentColor"
          strokeWidth={stroke * 0.5}
          className="text-border-default"
        />
        
        {/* Crosshair lines */}
        <line
          x1="24"
          y1="4"
          x2="24"
          y2="18"
          stroke="currentColor"
          strokeWidth={stroke}
          className="text-text-primary"
          strokeLinecap="round"
        />
        <line
          x1="24"
          y1="30"
          x2="24"
          y2="44"
          stroke="currentColor"
          strokeWidth={stroke}
          className="text-text-primary"
          strokeLinecap="round"
        />
        <line
          x1="4"
          y1="24"
          x2="18"
          y2="24"
          stroke="currentColor"
          strokeWidth={stroke}
          className="text-text-primary"
          strokeLinecap="round"
        />
        <line
          x1="30"
          y1="24"
          x2="44"
          y2="24"
          stroke="currentColor"
          strokeWidth={stroke}
          className="text-text-primary"
          strokeLinecap="round"
        />
        
        {/* Center dot */}
        <circle
          cx="24"
          cy="24"
          r={stroke * 1.5}
          className="fill-accent-primary"
        />
      </svg>

      {/* Logo Text */}
      {showText && (
        <div className="flex flex-col">
          <span className="text-text-primary font-bold text-lg tracking-tight leading-none">
            GloryPicks
          </span>
          <span className="text-text-tertiary text-[10px] uppercase tracking-wider font-medium leading-none mt-1">
            Professional Signals
          </span>
        </div>
      )}
    </div>
  );
}

// Simplified icon-only version for favicon/small spaces
export function LogoIcon({ className, size = 24 }: { className?: string; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <circle
        cx="24"
        cy="24"
        r="22"
        stroke="currentColor"
        strokeWidth="2"
        className="text-border-default"
      />
      <line
        x1="24"
        y1="4"
        x2="24"
        y2="18"
        stroke="currentColor"
        strokeWidth="3"
        className="text-text-primary"
        strokeLinecap="round"
      />
      <line
        x1="24"
        y1="30"
        x2="24"
        y2="44"
        stroke="currentColor"
        strokeWidth="3"
        className="text-text-primary"
        strokeLinecap="round"
      />
      <line
        x1="4"
        y1="24"
        x2="18"
        y2="24"
        stroke="currentColor"
        strokeWidth="3"
        className="text-text-primary"
        strokeLinecap="round"
      />
      <line
        x1="30"
        y1="24"
        x2="44"
        y2="24"
        stroke="currentColor"
        strokeWidth="3"
        className="text-text-primary"
        strokeLinecap="round"
      />
      <circle
        cx="24"
        cy="24"
        r="4"
        className="fill-accent-primary"
      />
    </svg>
  );
}
