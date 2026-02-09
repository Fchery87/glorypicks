"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useStore } from "@/lib/store";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Search, X, Command, TrendingUp, Star } from "lucide-react";

const POPULAR_SYMBOLS = {
  stocks: [
    { symbol: "AAPL", name: "Apple Inc.", sector: "Technology" },
    { symbol: "MSFT", name: "Microsoft Corp.", sector: "Technology" },
    { symbol: "GOOGL", name: "Alphabet Inc.", sector: "Technology" },
    { symbol: "AMZN", name: "Amazon.com Inc.", sector: "Consumer" },
    { symbol: "TSLA", name: "Tesla Inc.", sector: "Automotive" },
    { symbol: "NVDA", name: "NVIDIA Corp.", sector: "Technology" },
    { symbol: "META", name: "Meta Platforms", sector: "Technology" },
    { symbol: "NFLX", name: "Netflix Inc.", sector: "Entertainment" },
  ],
  crypto: [
    { symbol: "BTC-USD", name: "Bitcoin", sector: "Cryptocurrency" },
    { symbol: "ETH-USD", name: "Ethereum", sector: "Cryptocurrency" },
    { symbol: "SOL-USD", name: "Solana", sector: "Cryptocurrency" },
    { symbol: "ADA-USD", name: "Cardano", sector: "Cryptocurrency" },
    { symbol: "DOT-USD", name: "Polkadot", sector: "Cryptocurrency" },
    { symbol: "XRP-USD", name: "XRP", sector: "Cryptocurrency" },
  ],
  forex: [
    { symbol: "EURUSD", name: "EUR/USD", sector: "Forex" },
    { symbol: "GBPUSD", name: "GBP/USD", sector: "Forex" },
    { symbol: "USDJPY", name: "USD/JPY", sector: "Forex" },
    { symbol: "AUDUSD", name: "AUD/USD", sector: "Forex" },
    { symbol: "USDCAD", name: "USD/CAD", sector: "Forex" },
  ],
  indices: [
    { symbol: "SPY", name: "S&P 500 ETF", sector: "Index" },
    { symbol: "QQQ", name: "NASDAQ 100 ETF", sector: "Index" },
    { symbol: "DIA", name: "Dow Jones ETF", sector: "Index" },
    { symbol: "IWM", name: "Russell 2000 ETF", sector: "Index" },
    { symbol: "VTI", name: "Total Market ETF", sector: "Index" },
  ],
};

type AssetClass = "stocks" | "crypto" | "forex" | "indices" | "all";

export function TickerSearch() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeClass, setActiveClass] = useState<AssetClass>("all");
  const { symbol, setSymbol, addToWatchlist, watchlist } = useStore();
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setIsOpen(true);
        setTimeout(() => inputRef.current?.focus(), 0);
      }
      if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const handleSelect = (newSymbol: string) => {
    setSymbol(newSymbol);
    setIsOpen(false);
    setQuery("");
  };

  const getFilteredSymbols = useCallback(() => {
    const allSymbols = Object.entries(POPULAR_SYMBOLS).flatMap(([category, symbols]) =>
      symbols.map((s) => ({ ...s, category }))
    );

    let filtered = allSymbols;

    if (activeClass !== "all") {
      filtered = allSymbols.filter((s) => s.category === activeClass);
    }

    if (query) {
      const lowerQuery = query.toLowerCase();
      filtered = filtered.filter(
        (s) =>
          s.symbol.toLowerCase().includes(lowerQuery) ||
          s.name.toLowerCase().includes(lowerQuery)
      );
    }

    return filtered;
  }, [activeClass, query]);

  const filteredSymbols = getFilteredSymbols();
  const isInWatchlist = (sym: string) => watchlist.some((w) => w.symbol === sym);

  return (
    <div ref={containerRef} className="relative w-full max-w-md">
      {/* Search Trigger */}
      <button
        onClick={() => {
          setIsOpen(true);
          setTimeout(() => inputRef.current?.focus(), 0);
        }}
        className={cn(
          "w-full flex items-center gap-3 px-3 py-2 rounded-sm border text-left transition-colors",
          isOpen
            ? "bg-bg-tertiary border-border-strong"
            : "bg-bg-secondary border-border-default hover:border-border-strong"
        )}
      >
        <Search className="h-4 w-4 text-text-tertiary" />
        <span className="flex-1 text-text-secondary text-sm">
          {symbol}
        </span>
        <div className="flex items-center gap-1 text-text-tertiary">
          <kbd className="hidden sm:inline-flex items-center gap-1 px-1.5 py-0.5 bg-bg-tertiary border border-border-default rounded-sm text-[10px]">
            <Command className="h-3 w-3" />
            <span>K</span>
          </kbd>
        </div>
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-bg-secondary border border-border-default rounded-md shadow-lg z-50 overflow-hidden">
          {/* Search Input */}
          <div className="p-3 border-b border-border-subtle">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-tertiary" />
              <Input
                ref={inputRef}
                type="text"
                placeholder="Search symbols..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="pl-9 pr-9"
              />
              {query && (
                <button
                  onClick={() => setQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-text-secondary"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          {/* Category Filters */}
          <div className="flex items-center gap-1 p-2 border-b border-border-subtle overflow-x-auto">
            {(["all", "stocks", "crypto", "forex", "indices"] as AssetClass[]).map(
              (category) => (
                <button
                  key={category}
                  onClick={() => setActiveClass(category)}
                  className={cn(
                    "px-3 py-1.5 text-xs font-medium rounded-sm whitespace-nowrap transition-colors",
                    activeClass === category
                      ? "bg-bg-tertiary text-text-primary"
                      : "text-text-secondary hover:text-text-primary hover:bg-bg-tertiary"
                  )}
                >
                  {category.charAt(0).toUpperCase() + category.slice(1)}
                </button>
              )
            )}
          </div>

          {/* Results */}
          <div className="max-h-80 overflow-y-auto">
            {filteredSymbols.length === 0 ? (
              <div className="p-8 text-center">
                <Search className="h-8 w-8 text-text-tertiary mx-auto mb-3" />
                <p className="text-text-secondary text-sm">No symbols found</p>
                <p className="text-text-tertiary text-xs mt-1">
                  Try a different search term
                </p>
              </div>
            ) : (
              <div className="p-2">
                {filteredSymbols.map((item) => (
                  <div
                    key={item.symbol}
                    className={cn(
                      "group flex items-center justify-between p-3 rounded-sm cursor-pointer transition-colors",
                      symbol === item.symbol
                        ? "bg-bg-tertiary border border-border-default"
                        : "hover:bg-bg-tertiary border border-transparent"
                    )}
                    onClick={() => handleSelect(item.symbol)}
                  >
                    <div className="flex items-center gap-3">
                      <TrendingUp className="h-4 w-4 text-text-tertiary" />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-text-primary font-medium text-sm">
                            {item.symbol}
                          </span>
                          {symbol === item.symbol && (
                            <span className="text-[10px] px-1.5 py-0.5 bg-accent-primary/10 text-accent-primary rounded-sm">
                              Current
                            </span>
                          )}
                          {isInWatchlist(item.symbol) && (
                            <Star className="h-3 w-3 text-accent-primary fill-accent-primary" />
                          )}
                        </div>
                        <p className="text-text-tertiary text-xs">{item.name}</p>
                      </div>
                    </div>
                    <span className="text-text-tertiary text-xs uppercase">
                      {item.category}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-2 border-t border-border-subtle bg-bg-tertiary/50">
            <p className="text-text-tertiary text-xs text-center">
              Press <kbd className="px-1.5 py-0.5 bg-bg-tertiary border border-border-default rounded-sm mx-1">Esc</kbd> to close
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
