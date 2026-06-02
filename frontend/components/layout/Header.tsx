'use client';

import { Logo } from '@/components/icons/Logo';
import { Button } from '@/components/ui/button';
import { Settings, Menu, X, Command, Radio, ShieldCheck } from 'lucide-react';
import Link from 'next/link';

interface HeaderProps {
  onMenuToggle?: () => void;
  isMenuOpen?: boolean;
  children?: React.ReactNode;
}

export function Header({ onMenuToggle, isMenuOpen, children }: HeaderProps) {
  return (
    <header className="sticky top-0 z-50 h-[4.5rem] border-b border-border-subtle bg-bg-primary/80 backdrop-blur-xl supports-[backdrop-filter]:bg-bg-primary/70">
      <div className="flex h-full items-center justify-between gap-4 px-4 lg:px-6">
        {/* Left Section - Logo & Mobile Menu */}
        <div className="flex items-center gap-3 lg:gap-4">
          <Button
            variant="ghost"
            size="icon-sm"
            className="lg:hidden"
            onClick={onMenuToggle}
            aria-label={isMenuOpen ? 'Close menu' : 'Open menu'}
          >
            {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>

          <Link
            href="/"
            className="group flex items-center gap-3 transition-opacity hover:opacity-90"
          >
            <div className="relative rounded-lg border border-border-default bg-bg-tertiary/70 p-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] transition-colors group-hover:border-accent-primary/55">
              <Logo size="sm" showText={false} />
            </div>
            <div className="hidden sm:flex flex-col">
              <span className="text-text-primary font-semibold text-[15px] tracking-[-0.02em] leading-none">
                GloryPicks
              </span>
              <span className="text-accent-primary/80 text-[10px] uppercase tracking-[0.24em] font-mono leading-none mt-1.5">
                ICT Signal OS
              </span>
            </div>
          </Link>
        </div>

        {/* Center Section - Search & Symbol Selector */}
        <div className="flex-1 max-w-2xl mx-2 lg:mx-8">{children}</div>

        {/* Right Section - Actions */}
        <div className="flex items-center gap-2">
          <div className="hidden xl:flex items-center gap-2 status-chip">
            <span className="live-dot" />
            <Radio className="h-3.5 w-3.5 text-accent-cyan" />
            <span>Live market feed</span>
          </div>

          <div className="hidden md:flex items-center gap-1 text-text-tertiary text-[10px] font-mono uppercase tracking-[0.14em] mr-1">
            <kbd className="px-1.5 py-0.5 bg-bg-tertiary border border-border-default rounded-sm text-[10px] flex items-center">
              <Command className="h-3 w-3" />
            </kbd>
            <kbd className="px-1.5 py-0.5 bg-bg-tertiary border border-border-default rounded-sm text-[10px]">
              K
            </kbd>
          </div>

          <div className="hidden lg:flex items-center gap-1.5 rounded-full border border-accent-primary/20 bg-accent-primary/10 px-3 py-1.5 text-[10px] text-accent-primary font-mono uppercase tracking-[0.14em]">
            <ShieldCheck className="h-3.5 w-3.5" />
            Risk-first
          </div>

          <Link href="/settings" className="hidden sm:flex">
            <Button variant="ghost" size="icon" aria-label="Settings">
              <Settings className="h-5 w-5" />
            </Button>
          </Link>
        </div>
      </div>
    </header>
  );
}
