import { cn } from '@/lib/utils';

interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
}

const sizeMap = {
  sm: { container: 28, stroke: 2 },
  md: { container: 36, stroke: 2.5 },
  lg: { container: 48, stroke: 3 },
  xl: { container: 64, stroke: 4 },
};

export function Logo({ className, size = 'md', showText = true }: LogoProps) {
  const { container, stroke } = sizeMap[size];

  return (
    <div className={cn('flex items-center gap-3', className)}>
      <svg
        width={container}
        height={container}
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="flex-shrink-0"
        aria-label="GloryPicks logo"
      >
        <defs>
          <linearGradient id="gp-mark-stroke" x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#e6cd92" />
            <stop offset="1" stopColor="#b08a3c" />
          </linearGradient>
          <radialGradient id="gp-mark-core" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0" stopColor="#f6e0a3" />
            <stop offset="0.6" stopColor="#d9b86c" />
            <stop offset="1" stopColor="#d9b86c" stopOpacity="0" />
          </radialGradient>
        </defs>

        <circle cx="24" cy="24" r="22" stroke="url(#gp-mark-stroke)" strokeWidth={stroke * 0.6} opacity="0.55" />
        <circle cx="24" cy="24" r="15" stroke="rgba(217, 184, 108, 0.18)" strokeWidth={stroke * 0.4} />

        <line x1="24" y1="3" x2="24" y2="18" stroke="#f6f1e6" strokeWidth={stroke} strokeLinecap="round" />
        <line x1="24" y1="30" x2="24" y2="45" stroke="#f6f1e6" strokeWidth={stroke} strokeLinecap="round" />
        <line x1="3" y1="24" x2="18" y2="24" stroke="#f6f1e6" strokeWidth={stroke} strokeLinecap="round" />
        <line x1="30" y1="24" x2="45" y2="24" stroke="#f6f1e6" strokeWidth={stroke} strokeLinecap="round" />

        <circle cx="24" cy="24" r={stroke * 2.2} fill="url(#gp-mark-core)" />
        <circle cx="24" cy="24" r={stroke * 1.1} fill="#f6e0a3" />
      </svg>

      {showText && (
        <div className="flex flex-col leading-none">
          <span className="text-text-primary font-semibold text-[15px] tracking-[-0.02em] leading-none">
            GloryPicks
          </span>
          <span className="text-accent-primary/85 text-[10px] uppercase tracking-[0.24em] font-mono leading-none mt-1.5">
            ICT Signal OS
          </span>
        </div>
      )}
    </div>
  );
}

export function LogoIcon({ className, size = 24 }: { className?: string; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden
    >
      <defs>
        <linearGradient id="gp-mark-stroke-icon" x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#e6cd92" />
          <stop offset="1" stopColor="#b08a3c" />
        </linearGradient>
        <radialGradient id="gp-mark-core-icon" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#f6e0a3" />
          <stop offset="0.6" stopColor="#d9b86c" />
          <stop offset="1" stopColor="#d9b86c" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="24" cy="24" r="22" stroke="url(#gp-mark-stroke-icon)" strokeWidth="2.4" opacity="0.7" />
      <line x1="24" y1="3" x2="24" y2="18" stroke="#f6f1e6" strokeWidth="3" strokeLinecap="round" />
      <line x1="24" y1="30" x2="24" y2="45" stroke="#f6f1e6" strokeWidth="3" strokeLinecap="round" />
      <line x1="3" y1="24" x2="18" y2="24" stroke="#f6f1e6" strokeWidth="3" strokeLinecap="round" />
      <line x1="30" y1="24" x2="45" y2="24" stroke="#f6f1e6" strokeWidth="3" strokeLinecap="round" />
      <circle cx="24" cy="24" r="6" fill="url(#gp-mark-core-icon)" />
      <circle cx="24" cy="24" r="2.4" fill="#f6e0a3" />
    </svg>
  );
}
