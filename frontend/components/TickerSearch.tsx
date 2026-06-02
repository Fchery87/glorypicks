'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useStore } from '@/lib/store';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { Search, X, Command, TrendingUp, Star, Sparkles } from 'lucide-react';

const POPULAR_SYMBOLS = {
  stocks: [
    { symbol: 'AAPL', name: 'Apple Inc.', sector: 'Technology' },
    { symbol: 'MSFT', name: 'Microsoft Corp.', sector: 'Technology' },
    { symbol: 'GOOGL', name: 'Alphabet Inc.', sector: 'Technology' },
    { symbol: 'AMZN', name: 'Amazon.com Inc.', sector: 'Consumer' },
    { symbol: 'TSLA', name: 'Tesla Inc.', sector: 'Automotive' },
    { symbol: 'NVDA', name: 'NVIDIA Corp.', sector: 'Technology' },
    { symbol: 'META', name: 'Meta Platforms', sector: 'Technology' },
    { symbol: 'NFLX', name: 'Netflix Inc.', sector: 'Entertainment' },
  ],
  crypto: [
    { symbol: 'BTC-USD', name: 'Bitcoin', sector: 'Cryptocurrency' },
    { symbol: 'ETH-USD', name: 'Ethereum', sector: 'Cryptocurrency' },
    { symbol: 'SOL-USD', name: 'Solana', sector: 'Cryptocurrency' },
    { symbol: 'ADA-USD', name: 'Cardano', sector: 'Cryptocurrency' },
    { symbol: 'DOT-USD', name: 'Polkadot', sector: 'Cryptocurrency' },
    { symbol: 'XRP-USD', name: 'XRP', sector: 'Cryptocurrency' },
  ],
  forex: [
    { symbol: 'EURUSD', name: 'EUR/USD', sector: 'Forex' },
    { symbol: 'GBPUSD', name: 'GBP/USD', sector: 'Forex' },
    { symbol: 'USDJPY', name: 'USD/JPY', sector: 'Forex' },
    { symbol: 'AUDUSD', name: 'AUD/USD', sector: 'Forex' },
    { symbol: 'USDCAD', name: 'USD/CAD', sector: 'Forex' },
  ],
  indices: [
    { symbol: 'SPY', name: 'S&P 500 ETF', sector: 'Index' },
    { symbol: 'QQQ', name: 'NASDAQ 100 ETF', sector: 'Index' },
    { symbol: 'DIA', name: 'Dow Jones ETF', sector: 'Index' },
    { symbol: 'IWM', name: 'Russell 2000 ETF', sector: 'Index' },
    { symbol: 'VTI', name: 'Total Market ETF', sector: 'Index' },
  ],
};

type AssetClass = 'stocks' | 'crypto' | 'forex' | 'indices' | 'all';

export { POPULAR_SYMBOLS };

export function TickerSearch() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeClass, setActiveClass] = useState<AssetClass>('all');
  const { symbol, setSymbol, watchlist } = useStore();
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(true);
        setTimeout(() => inputRef.current?.focus(), 0);
      }
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

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

  const handleSelect = (newSymbol: string) => {
    setSymbol(newSymbol);
    setIsOpen(false);
    setQuery('');
  };

  const getFilteredSymbols = useCallback(() => {
    const allSymbols = Object.entries(POPULAR_SYMBOLS).flatMap(([category, symbols]) =>
      symbols.map((s) => ({ ...s, category }))
    );

    let filtered = allSymbols;

    if (activeClass !== 'all') {
      filtered = allSymbols.filter((s) => s.category === activeClass);
    }

    if (query) {
      const lowerQuery = query.toLowerCase();
      filtered = filtered.filter(
        (s) =>
          s.symbol.toLowerCase().includes(lowerQuery) || s.name.toLowerCase().includes(lowerQuery)
      );
    }

    return filtered;
  }, [activeClass, query]);

  const filteredSymbols = getFilteredSymbols();
  const isInWatchlist = (sym: string) => watchlist.some((w) => w.symbol === sym);

  return (
    <div ref={containerRef} className="relative w-full max-w-md">
      <button
        onClick={() => {
          setIsOpen(true);
          setTimeout(() => inputRef.current?.focus(), 0);
        }}
        className={cn(
          'group relative w-full flex items-center gap-3 rounded-lg border px-3.5 py-2 text-left transition-all duration-200',
          isOpen
            ? 'bg-bg-tertiary border-accent-primary/55 shadow-[0_0_0_3px_color-mix(in_oklch,var(--color-accent-primary)_15%,transparent)]'
            : 'bg-bg-secondary/70 border-border-default hover:border-accent-primary/40 hover:bg-bg-tertiary/70'
        )}
      >
        <Search
          className={cn(
            'h-4 w-4 transition-colors',
            isOpen ? 'text-accent-primary' : 'text-text-tertiary'
          )}
        />
        <span className="flex-1 text-text-secondary text-sm font-mono">{symbol}</span>
        <span className="hidden sm:inline-flex items-center gap-1 text-text-tertiary">
          <kbd className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-bg-tertiary border border-border-default rounded-sm text-[10px] font-mono">
            <Command className="h-3 w-3" />
            <span>K</span>
          </kbd>
        </span>
      </button>

      {isOpen && (
        <div
          className={cn(
            'absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-xl border border-border-default bg-bg-secondary/95 backdrop-blur-xl',
            'shadow-[0_24px_80px_-12px_rgba(0,0,0,0.7)]',
            'origin-top'
          )}
          style={{
            animation: 'dropdownIn 180ms cubic-bezier(0.23, 1, 0.32, 1) both',
          }}
        >
          <div className="p-3 border-b border-border-subtle">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-tertiary" />
              <Input
                ref={inputRef}
                type="text"
                placeholder="Search tickers…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="pl-9 pr-9 h-9 font-mono text-sm"
              />
              {query && (
                <button
                  onClick={() => setQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-text-primary transition-colors"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1 p-2 border-b border-border-subtle overflow-x-auto scrollbar-hide">
            {(['all', 'stocks', 'crypto', 'forex', 'indices'] as AssetClass[]).map((category) => (
              <button
                key={category}
                onClick={() => setActiveClass(category)}
                className={cn(
                  'px-2.5 py-1.5 text-[11px] font-medium font-mono uppercase tracking-[0.12em] rounded-md whitespace-nowrap transition-all',
                  activeClass === category
                    ? 'bg-accent-primary/15 text-accent-primary border border-accent-primary/30'
                    : 'text-text-tertiary hover:text-text-secondary hover:bg-bg-tertiary border border-transparent'
                )}
              >
                {category === 'all' ? 'All' : category}
              </button>
            ))}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {filteredSymbols.length === 0 ? (
              <div className="p-8 text-center">
                <Search className="h-8 w-8 text-text-tertiary mx-auto mb-3" />
                <p className="text-text-secondary text-sm">No symbols found</p>
                <p className="text-text-tertiary text-xs mt-1">Try a different search term</p>
              </div>
            ) : (
              <div className="p-1.5">
                {filteredSymbols.map((item) => {
                  const isActive = symbol === item.symbol;
                  return (
                    <div
                      key={item.symbol}
                      className={cn(
                        'group flex cursor-pointer items-center justify-between rounded-lg px-3 py-2.5 transition-colors duration-150',
                        isActive
                          ? 'bg-accent-primary/8 border border-accent-primary/20'
                          : 'border border-transparent hover:bg-bg-tertiary'
                      )}
                      onClick={() => handleSelect(item.symbol)}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={cn(
                            'flex h-7 w-7 items-center justify-center rounded-md border',
                            isActive
                              ? 'border-accent-primary/40 bg-accent-primary/10 text-accent-primary'
                              : 'border-border-subtle bg-bg-tertiary text-text-tertiary'
                          )}
                        >
                          <TrendingUp className="h-3.5 w-3.5" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span
                              className={cn(
                                'font-mono text-sm font-semibold tracking-[0.04em]',
                                isActive ? 'text-accent-primary' : 'text-text-primary'
                              )}
                            >
                              {item.symbol}
                            </span>
                            {isActive && (
                              <span className="inline-flex items-center gap-1 text-[9px] px-1.5 py-0.5 bg-accent-primary/15 text-accent-primary rounded font-mono uppercase tracking-[0.14em]">
                                <Sparkles className="h-2.5 w-2.5" />
                                Active
                              </span>
                            )}
                            {isInWatchlist(item.symbol) && (
                              <Star className="h-3 w-3 text-accent-primary fill-accent-primary" />
                            )}
                          </div>
                          <p className="text-text-tertiary text-xs truncate">{item.name}</p>
                        </div>
                      </div>
                      <span className="text-text-tertiary text-[10px] uppercase tracking-[0.14em] font-mono">
                        {item.category}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="px-3 py-2 border-t border-border-subtle bg-bg-tertiary/40 flex items-center justify-between text-[10px] text-text-tertiary font-mono uppercase tracking-[0.14em]">
            <span>{filteredSymbols.length} result{filteredSymbols.length === 1 ? '' : 's'}</span>
            <span className="flex items-center gap-1">
              Press{' '}
              <kbd className="px-1.5 py-0.5 bg-bg-tertiary border border-border-default rounded-sm">
                Esc
              </kbd>{' '}
              to close
            </span>
          </div>
        </div>
      )}

    </div>
  );
}
