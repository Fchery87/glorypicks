"use client"

import { useEffect, useState } from 'react';
import { useStore } from '@/lib/store';
import { getSessionId } from '@/lib/session';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Loader2 } from 'lucide-react';

/**
 * WatchlistItem - Displays symbols in a watchlist with real-time signals
 * 
 * Features:
 * - Show all symbols in the watchlist
 * - Display current trading signal for each symbol
 * - Show signal strength with progress bar
 * - Click symbol to load in main chart
 * - Real-time signal updates
 */
interface WatchlistItemProps {
  watchlistId: string;
}

interface SymbolSignal {
  symbol: string;
  recommendation: 'Buy' | 'Sell' | 'Neutral';
  strength: number;
  currentPrice: number;
  change?: number;
}

export function WatchlistItem({ watchlistId }: WatchlistItemProps) {
  const { watchlists, setSymbol, addToast } = useStore();
  const [signals, setSignals] = useState<Record<string, SymbolSignal>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const watchlist = watchlists.find((w) => w.id === watchlistId);
  
  useEffect(() => {
    if (!watchlist || watchlist.symbols.length === 0) {
      setIsLoading(false);
      return;
    }
    
    const fetchSignals = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        const signalPromises = watchlist.symbols.map(async (symbol) => {
          try {
            const response = await fetch(
              `http://localhost:8000/signal?symbol=${encodeURIComponent(symbol)}`,
              {
                headers: {
                  'X-Session-ID': getSessionId()
                }
              }
            );
            
            if (response.ok) {
              const data = await response.json();
              return {
                symbol,
                recommendation: data.recommendation,
                strength: data.strength,
                currentPrice: data.current_price || 0,
                change: data.change
              };
            } else {
              return null;
            }
          } catch (err) {
            console.error(`Error fetching signal for ${symbol}:`, err);
            return null;
          }
        });
        
        const results = await Promise.all(signalPromises);
        
        // Convert array to object keyed by symbol
        const signalsMap: Record<string, SymbolSignal> = {};
        results.forEach((result) => {
          if (result) {
            signalsMap[result.symbol] = result;
          }
        });
        
        setSignals(signalsMap);
      } catch (err) {
        console.error('Error fetching signals:', err);
        setError('Failed to load signals');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchSignals();
    
    // Refresh signals every 30 seconds
    const interval = setInterval(fetchSignals, 30000);
    
    return () => clearInterval(interval);
  }, [watchlistId, watchlist]);
  
  const handleSymbolClick = (symbol: string) => {
    setSymbol(symbol);
    addToast(`Loaded ${symbol} in chart`, 'info');
  };
  
  if (!watchlist || watchlist.symbols.length === 0) {
    return (
      <div className="py-4 text-center text-sm text-muted-foreground">
        No symbols in this watchlist.
      </div>
    );
  }
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-4 text-muted-foreground">
        <Loader2 className="w-4 h-4 animate-spin mr-2" />
        <span className="text-sm">Loading signals...</span>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="py-4 text-center text-sm text-destructive">
        {error}
      </div>
    );
  }
  
  return (
    <div className="py-2 space-y-1">
      {watchlist.symbols.map((symbol) => {
        const signal = signals[symbol];
        
        return (
          <button
            key={symbol}
            onClick={() => handleSymbolClick(symbol)}
            className="w-full flex items-center justify-between p-2 rounded hover:bg-muted transition-colors text-left group"
            title={`Click to view ${symbol} chart`}
          >
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <span className="font-mono text-sm font-medium group-hover:text-primary transition-colors">
                {symbol}
              </span>
              
              {signal && (
                <div className="flex items-center gap-2 flex-shrink-0">
                  {/* Signal Badge */}
                  <Badge
                    variant={
                      signal.recommendation === 'Buy'
                        ? 'default'
                        : signal.recommendation === 'Sell'
                        ? 'destructive'
                        : 'secondary'
                    }
                    className="text-xs px-2 py-0"
                  >
                    {signal.recommendation}
                  </Badge>
                  
                  {/* Strength Progress Bar */}
                  <div className="flex items-center gap-2 min-w-[80px]">
                    <Progress
                      value={signal.strength}
                      className="w-16 h-2"
                    />
                    <span className="text-xs text-muted-foreground w-8 text-right font-mono">
                      {signal.strength}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}
