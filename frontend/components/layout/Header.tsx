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
      <div className="flex h-full items-center justify-between px-4 lg:px-6">
        {/* Left Section - Logo & Mobile Menu */}
        <div className="flex items-center gap-4">
          {/* Mobile Menu Toggle */}
          <Button
            variant="ghost"
            size="icon-sm"
            className="lg:hidden"
            onClick={onMenuToggle}
            aria-label={isMenuOpen ? 'Close menu' : 'Open menu'}
          >
            {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>

          {/* Logo */}
          <Link
            href="/"
            className="group flex items-center gap-3 hover:opacity-95 transition-opacity"
          >
            <div className="rounded-xl border border-border-default bg-bg-tertiary/70 p-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] group-hover:border-accent-primary/50 transition-colors">
              <Logo size="sm" showText={false} />
            </div>
            <div className="hidden sm:flex flex-col">
              <span className="text-text-primary font-semibold text-[15px] tracking-tight leading-none">
                GloryPicks
              </span>
              <span className="text-accent-primary/80 text-[10px] uppercase tracking-[0.22em] font-mono leading-none mt-1.5">
                ICT Signal OS
              </span>
            </div>
          </Link>
        </div>

        {/* Center Section - Search & Symbol Selector */}
        <div className="flex-1 max-w-2xl mx-4 lg:mx-10">{children}</div>

        {/* Right Section - Actions */}
        <div className="flex items-center gap-2">
          <div className="hidden xl:flex items-center gap-2 rounded-full border border-border-subtle bg-bg-tertiary/60 px-3 py-1.5 text-xs text-text-secondary">
            <span className="live-dot" />
            <Radio className="h-3.5 w-3.5 text-accent-cyan" />
            <span className="font-mono uppercase tracking-[0.16em]">Live market feed</span>
          </div>

          <div className="hidden md:flex items-center gap-1.5 text-text-tertiary text-xs mr-2">
            <kbd className="px-1.5 py-0.5 bg-bg-tertiary border border-border-default rounded-sm font-mono text-[10px]">
              <Command className="h-3 w-3 inline" />
            </kbd>
            <kbd className="px-1.5 py-0.5 bg-bg-tertiary border border-border-default rounded-sm font-mono text-[10px]">
              K
            </kbd>
          </div>

          <div className="hidden lg:flex items-center gap-2 rounded-full border border-accent-primary/20 bg-accent-primary/10 px-3 py-1.5 text-xs text-accent-primary">
            <ShieldCheck className="h-3.5 w-3.5" />
            <span className="font-mono uppercase tracking-[0.14em]">Risk-first</span>
          </div>

          {/* Settings Button */}
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
