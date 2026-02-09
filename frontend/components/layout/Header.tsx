"use client";

import { useState } from "react";
import { Logo } from "@/components/icons/Logo";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Settings, Menu, X, Command } from "lucide-react";
import Link from "next/link";

interface HeaderProps {
  onMenuToggle?: () => void;
  isMenuOpen?: boolean;
  children?: React.ReactNode;
}

export function Header({ onMenuToggle, isMenuOpen, children }: HeaderProps) {
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 h-16 border-b border-border-subtle bg-bg-primary/95 backdrop-blur-sm">
      <div className="flex h-full items-center justify-between px-4 lg:px-6">
        {/* Left Section - Logo & Mobile Menu */}
        <div className="flex items-center gap-4">
          {/* Mobile Menu Toggle */}
          <Button
            variant="ghost"
            size="icon-sm"
            className="lg:hidden"
            onClick={onMenuToggle}
            aria-label={isMenuOpen ? "Close menu" : "Open menu"}
          >
            {isMenuOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </Button>

          {/* Logo */}
          <Link href="/" className="hover:opacity-80 transition-opacity">
            <Logo size="md" />
          </Link>
        </div>

        {/* Center Section - Search & Symbol Selector */}
        <div className="flex-1 max-w-xl mx-4 lg:mx-8">
          {children}
        </div>

        {/* Right Section - Actions */}
        <div className="flex items-center gap-2">
          {/* Keyboard Shortcut Hint */}
          <div className="hidden md:flex items-center gap-1.5 text-text-tertiary text-xs mr-4">
            <kbd className="px-1.5 py-0.5 bg-bg-tertiary border border-border-default rounded-sm font-mono text-[10px]">
              <Command className="h-3 w-3 inline" />
            </kbd>
            <kbd className="px-1.5 py-0.5 bg-bg-tertiary border border-border-default rounded-sm font-mono text-[10px]">
              K
            </kbd>
            <span className="ml-1">to search</span>
          </div>

          {/* Settings Button */}
          <Link href="/settings" className="hidden sm:flex">
            <Button
              variant="ghost"
              size="icon"
              aria-label="Settings"
            >
              <Settings className="h-5 w-5" />
            </Button>
          </Link>
        </div>
      </div>
    </header>
  );
}
