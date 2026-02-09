"use client";

import { useStore } from "@/lib/store";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { MiniSignal } from "@/types";
import { 
  FileText, 
  TrendingUp, 
  TrendingDown, 
  Minus,
  Target,
  Zap,
  BarChart3,
  Activity
} from "lucide-react";

interface TimeframeRationale {
  timeframe: string;
  signal: MiniSignal;
  rationale: string[];
}

const RATIONALE_ICONS: Record<string, React.ReactNode> = {
  "breaker": <Target className="h-4 w-4 text-accent-primary" />,
  "fvg": <Zap className="h-4 w-4 text-accent-primary" />,
  "bos": <BarChart3 className="h-4 w-4 text-accent-primary" />,
  "mss": <Activity className="h-4 w-4 text-accent-primary" />,
};

function getRationaleIcon(text: string) {
  const lowerText = text.toLowerCase();
  if (lowerText.includes("breaker")) return RATIONALE_ICONS["breaker"];
  if (lowerText.includes("fair value") || lowerText.includes("fvg")) return RATIONALE_ICONS["fvg"];
  if (lowerText.includes("bos") || lowerText.includes("break of structure")) return RATIONALE_ICONS["bos"];
  if (lowerText.includes("mss") || lowerText.includes("market structure")) return RATIONALE_ICONS["mss"];
  return null;
}

function getRationaleColor(text: string) {
  const lowerText = text.toLowerCase();
  if (lowerText.includes("bullish") || lowerText.includes("buy")) return "text-accent-bullish";
  if (lowerText.includes("bearish") || lowerText.includes("sell")) return "text-accent-bearish";
  return "text-text-secondary";
}

export function RationaleList() {
  const signal = useStore((state) => state.signal);

  if (!signal) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <h3 className="text-h3 font-semibold text-text-primary">Signal Rationale</h3>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <FileText className="h-8 w-8 text-text-tertiary mx-auto mb-3" />
            <p className="text-text-secondary text-sm">No signal rationale available</p>
            <p className="text-text-tertiary text-xs mt-1">Select a symbol to generate a signal</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Build timeframe breakdown from signal
  const timeframeData: TimeframeRationale[] = [
    {
      timeframe: "1D",
      signal: signal.breakdown?.d1 || "Neutral",
      rationale: signal.rationale?.filter(r => 
        r.toLowerCase().includes("daily") || 
        r.toLowerCase().includes("trend")
      ) || [],
    },
    {
      timeframe: "1H",
      signal: signal.breakdown?.h1 || "Neutral",
      rationale: signal.rationale?.filter(r => 
        r.toLowerCase().includes("hour") || 
        r.toLowerCase().includes("momentum")
      ) || [],
    },
    {
      timeframe: "15M",
      signal: signal.breakdown?.m15 || "Neutral",
      rationale: signal.rationale?.filter(r => 
        r.toLowerCase().includes("15") || 
        r.toLowerCase().includes("short")
      ) || [],
    },
  ].filter(item => item.rationale.length > 0);

  // Distribute remaining rationale across timeframes
  const usedRationale = timeframeData.flatMap(item => item.rationale);
  const remainingRationale = signal.rationale?.filter(r => !usedRationale.includes(r)) || [];
  
  // Evenly distribute remaining rationale
  remainingRationale.forEach((r, index) => {
    const targetIndex = index % Math.max(timeframeData.length, 1);
    if (timeframeData[targetIndex]) {
      timeframeData[targetIndex].rationale.push(r);
    }
  });

  const getSignalStyles = (signalVal: MiniSignal) => {
    switch (signalVal) {
      case "Bullish":
        return {
          badge: "bg-accent-bullish/10 text-accent-bullish border-accent-bullish/30",
          icon: TrendingUp,
          iconColor: "text-accent-bullish",
        };
      case "Bearish":
        return {
          badge: "bg-accent-bearish/10 text-accent-bearish border-accent-bearish/30",
          icon: TrendingDown,
          iconColor: "text-accent-bearish",
        };
      default:
        return {
          badge: "bg-text-secondary/10 text-text-secondary border-text-secondary/30",
          icon: Minus,
          iconColor: "text-text-secondary",
        };
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <h3 className="text-h3 font-semibold text-text-primary">Signal Rationale</h3>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-4">
          {timeframeData.map((item) => {
            const styles = getSignalStyles(item.signal);
            const Icon = styles.icon;
            
            return (
              <div
                key={item.timeframe}
                className="p-4 bg-bg-secondary rounded-sm border border-border-subtle"
              >
                {/* Timeframe Header */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <Icon className={cn("h-5 w-5", styles.iconColor)} />
                    <span className="text-text-primary font-medium">{item.timeframe}</span>
                  </div>
                  
                  <Badge 
                    variant="outline"
                    className={cn("text-xs font-medium px-2 py-1 border", styles.badge)}
                  >
                    {item.signal}
                  </Badge>
                </div>

                {/* Rationale Items */}
                <ul className="space-y-2">
                  {item.rationale.map((reason, idx) => (
                    <li
                      key={idx}
                      className="flex items-start gap-2 text-sm"
                    >
                      {getRationaleIcon(reason) || (
                        <span className="w-1.5 h-1.5 rounded-full bg-border-strong mt-2 flex-shrink-0" />
                      )}
                      <span className={cn("leading-relaxed", getRationaleColor(reason))}>
                        {reason}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>

        {/* ICT Strategy Tags */}
        {signal.ict_analysis && (
          <div className="mt-4 pt-4 border-t border-border-subtle">
            <h4 className="text-caption text-text-secondary uppercase tracking-wider mb-3">
              ICT Signals Detected
            </h4>
            <div className="flex flex-wrap gap-2">
              {signal.ict_analysis.breaker_blocks?.length > 0 && (
                <span className="px-2 py-1 bg-accent-primary/10 text-accent-primary text-xs rounded-sm border border-accent-primary/20">
                  Breaker Block
                </span>
              )}
              {signal.ict_analysis.fair_value_gaps?.length > 0 && (
                <span className="px-2 py-1 bg-accent-primary/10 text-accent-primary text-xs rounded-sm border border-accent-primary/20">
                  Fair Value Gap
                </span>
              )}
              {signal.ict_analysis.market_phase && (
                <span className="px-2 py-1 bg-accent-primary/10 text-accent-primary text-xs rounded-sm border border-accent-primary/20">
                  {signal.ict_analysis.market_phase.type}
                </span>
              )}
              {signal.ict_analysis.structure && (
                <span className="px-2 py-1 bg-accent-primary/10 text-accent-primary text-xs rounded-sm border border-accent-primary/20">
                  {signal.ict_analysis.structure.trend}
                </span>
              )}
            </div>
          </div>
        )}

        {/* No rationale fallback */}
        {(!signal.rationale || signal.rationale.length === 0) && timeframeData.length === 0 && (
          <div className="text-center text-text-secondary py-8">
            <p className="text-sm">No detailed rationale available for this signal.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
