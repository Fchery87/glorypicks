'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Search, X, TrendingUp, Star } from 'lucide-react';
import { POPULAR_SYMBOLS } from './TickerSearch';

type AssetClass = 'stocks' | 'crypto' | 'forex' | 'indices' | 'all';

interface SymbolPickerProps {
  value: string;
  onChange: (value: string) => void;
  onSelect: (symbol: string) => void;
  placeholder?: string;
  className?: string;
  watchlistSymbols?: string[]; // To show which are already in watchlist
}

export function SymbolPicker({
  value,
  onChange,
  onSelect,
  placeholder = 'Search symbols...',
  className,
  watchlistSymbols = [],
}: SymbolPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState<AssetClass>('all');
  const containerRef = useRef<HTMLDivElement>(null);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Filter symbols
  const filteredSymbols = useMemo(() => {
    const all = Object.entries(POPULAR_SYMBOLS).flatMap(([category, symbols]) =>
      symbols.map((s) => ({ ...s, category }))
    );

    let filtered = all;
    if (activeCategory !== 'all') {
      filtered = all.filter((s) => s.category === activeCategory);
    }

    if (value) {
      const query = value.toLowerCase();
      filtered = filtered.filter(
        (s) => s.symbol.toLowerCase().includes(query) || s.name.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [activeCategory, value]);

  const isInWatchlist = (symbol: string) =>
    watchlistSymbols.some((s) => s.toUpperCase() === symbol.toUpperCase());

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-tertiary" />
        <Input
          value={value}
          onChange={(e) => {
            onChange(e.target.value.toUpperCase());
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder}
          className="pl-9 pr-9"
        />
        {value && (
          <button
            onClick={() => {
              onChange('');
              setIsOpen(false);
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-text-secondary"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-bg-secondary border border-border-default rounded-md shadow-lg z-50 max-h-80 overflow-hidden">
          {/* Categories */}
          <div className="flex items-center gap-1 p-2 border-b border-border-subtle overflow-x-auto">
            {(['all', 'stocks', 'crypto', 'forex', 'indices'] as AssetClass[]).map((category) => (
              <button
                key={category}
                onClick={() => setActiveCategory(category)}
                className={cn(
                  'px-3 py-1 text-xs font-medium rounded-sm whitespace-nowrap transition-colors',
                  activeCategory === category
                    ? 'bg-bg-tertiary text-text-primary'
                    : 'text-text-secondary hover:text-text-primary hover:bg-bg-tertiary'
                )}
              >
                {category.charAt(0).toUpperCase() + category.slice(1)}
              </button>
            ))}
          </div>

          {/* Results */}
          <div className="max-h-60 overflow-y-auto p-1">
            {filteredSymbols.length === 0 ? (
              <div className="p-4 text-center text-text-secondary text-sm">No symbols found</div>
            ) : (
              filteredSymbols.map((item) => (
                <button
                  key={item.symbol}
                  onClick={() => {
                    onSelect(item.symbol);
                    setIsOpen(false);
                  }}
                  disabled={isInWatchlist(item.symbol)}
                  className={cn(
                    'w-full flex items-center justify-between p-2 rounded-sm text-left transition-colors',
                    isInWatchlist(item.symbol)
                      ? 'opacity-50 cursor-not-allowed'
                      : 'hover:bg-bg-tertiary'
                  )}
                >
                  <div className="flex items-center gap-3">
                    <TrendingUp className="h-4 w-4 text-text-tertiary" />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-text-primary text-sm">{item.symbol}</span>
                        {isInWatchlist(item.symbol) && (
                          <>
                            <Star className="h-3 w-3 text-accent-primary fill-accent-primary" />
                            <span className="text-[10px] text-accent-primary">In watchlist</span>
                          </>
                        )}
                      </div>
                      <p className="text-text-tertiary text-xs">{item.name}</p>
                    </div>
                  </div>
                  <span className="text-text-tertiary text-xs uppercase">{item.category}</span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
