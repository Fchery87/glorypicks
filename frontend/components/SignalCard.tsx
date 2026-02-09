"use client";

import { useStore } from "@/lib/store";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, Minus, Loader2, AlertCircle, Brain, Target, Zap } from "lucide-react";

export function SignalCard() {
  const { signal, isLoadingSignal, signalError } = useStore();

  if (isLoadingSignal) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-48">
          <div className="flex items-center gap-3 text-text-secondary">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span className="text-sm">Analyzing market data...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (signalError) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center h-48 text-center">
          <AlertCircle className="h-8 w-8 text-error mb-3" />
          <p className="text-error text-sm">{signalError}</p>
        </CardContent>
      </Card>
    );
  }

  if (!signal) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center h-48 text-center">
          <div className="w-12 h-12 rounded-full bg-bg-tertiary flex items-center justify-center mb-3">
            <TrendingUp className="h-6 w-6 text-text-tertiary" />
          </div>
          <p className="text-text-secondary text-sm">No signal available</p>
          <p className="text-text-tertiary text-xs mt-1">Select a symbol to analyze</p>
        </CardContent>
      </Card>
    );
  }

  const strengthPercent = signal.strength;
  
  const getSignalConfig = () => {
    switch (signal.recommendation) {
      case "Buy":
        return {
          icon: TrendingUp,
          label: "BUY",
          color: "text-accent-bullish",
          bgColor: "bg-accent-bullish/10",
          borderColor: "border-accent-bullish/30",
          progressVariant: "bullish" as const,
        };
      case "Sell":
        return {
          icon: TrendingDown,
          label: "SELL",
          color: "text-accent-bearish",
          bgColor: "bg-accent-bearish/10",
          borderColor: "border-accent-bearish/30",
          progressVariant: "bearish" as const,
        };
      default:
        return {
          icon: Minus,
          label: "NEUTRAL",
          color: "text-text-secondary",
          bgColor: "bg-text-secondary/10",
          borderColor: "border-text-secondary/30",
          progressVariant: "neutral" as const,
        };
    }
  };

  const config = getSignalConfig();
  const Icon = config.icon;

  const getStrengthLabel = () => {
    if (strengthPercent >= 70) return "Strong";
    if (strengthPercent >= 40) return "Moderate";
    return "Weak";
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <h3 className="text-h3 font-semibold text-text-primary">Signal Analysis</h3>
          {signal.updated_at && (
            <span className="text-text-tertiary text-xs">
              {new Date(signal.updated_at).toLocaleTimeString()}
            </span>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Signal Badge */}
        <div className="flex items-center gap-4">
          <div className={cn(
            "w-14 h-14 rounded-sm flex items-center justify-center border",
            config.bgColor,
            config.borderColor
          )}>
            <Icon className={cn("h-7 w-7", config.color)} />
          </div>
          
          <div className="flex-1">
            <Badge 
              variant="signal" 
              className={cn(
                config.color,
                config.bgColor,
                config.borderColor,
                "border"
              )}
            >
              {config.label}
            </Badge>
          </div>
        </div>

        {/* Strength Meter */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-text-secondary text-sm">Confidence Score</span>
            <div className="flex items-baseline gap-2">
              <span className="text-data-lg font-mono text-text-primary">
                {strengthPercent}
              </span>
              <span className="text-text-tertiary text-sm">/100</span>
            </div>
          </div>
          
          <Progress
            value={strengthPercent}
            max={100}
            variant={config.progressVariant}
          />
          
          <div className="flex justify-between items-center">
            <span className={cn("text-xs font-medium uppercase tracking-wider", config.color)}>
              {getStrengthLabel()} Signal
            </span>
          </div>
        </div>

        {/* Timeframe Breakdown */}
        {signal.breakdown && (
          <div className="pt-4 border-t border-border-subtle">
            <h4 className="text-caption text-text-secondary uppercase tracking-wider mb-3">
              Timeframe Analysis
            </h4>
            <div className="space-y-2">
              {Object.entries(signal.breakdown).map(([tf, data]: [string, any]) => (
                <div key={tf} className="flex items-center justify-between">
                  <span className="text-text-secondary text-sm">{tf}</span>
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      "text-sm font-medium",
                      data === "Bullish" ? "text-accent-bullish" :
                      data === "Bearish" ? "text-accent-bearish" :
                      "text-text-secondary"
                    )}>
                      {data}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* AI & Strategy Analysis */}
        {signal.rationale && signal.rationale.length > 0 && (
          <div className="pt-4 border-t border-border-subtle space-y-3">
            {/* AI Confidence Badge */}
            {signal.rationale.some(r => r.includes('AI Confidence')) && (
              <div className="flex items-center justify-between p-3 bg-bg-elevated rounded-sm">
                <div className="flex items-center gap-2">
                  <Brain className="h-4 w-4 text-accent-primary" />
                  <span className="text-text-secondary text-sm">AI Confidence</span>
                </div>
                <span className="font-mono text-accent-primary">
                  {signal.rationale.find(r => r.includes('AI Confidence'))?.match(/\d+%/)?.[0] || 'N/A'}
                </span>
              </div>
            )}

            {/* Market Regime */}
            {signal.rationale.some(r => r.includes('Market Regime')) && (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Target className="h-4 w-4 text-text-secondary" />
                  <span className="text-text-secondary text-sm">Market Regime</span>
                </div>
                <Badge variant="outline" className="text-xs">
                  {signal.rationale.find(r => r.includes('Market Regime'))?.replace('Market Regime:', '').trim()}
                </Badge>
              </div>
            )}

            {/* Strategy Tags */}
            <div className="flex flex-wrap gap-2 pt-2">
              {signal.rationale
                .filter(r => r.includes('ICT:') || r.includes('SMC:'))
                .map((r, idx) => {
                  const isICT = r.includes('ICT:');
                  const isSMC = r.includes('SMC:');
                  const cleanText = r.replace('📊', '').replace('🎯', '').replace('ICT:', '').replace('SMC:', '').trim();
                  
                  return (
                    <Badge 
                      key={idx}
                      variant="outline"
                      className={cn(
                        "text-xs",
                        isICT && "border-accent-primary/50 text-accent-primary",
                        isSMC && "border-accent-bullish/50 text-accent-bullish"
                      )}
                    >
                      {isICT && <Zap className="h-3 w-3 mr-1" />}
                      {isSMC && <Target className="h-3 w-3 mr-1" />}
                      {cleanText}
                    </Badge>
                  );
                })}
            </div>
          </div>
        )}

        {/* Rationale List */}
        {signal.rationale && (
          <div className="pt-4 border-t border-border-subtle">
            <h4 className="text-caption text-text-secondary uppercase tracking-wider mb-3">
              Analysis Details
            </h4>
            <ul className="space-y-2">
              {signal.rationale
                .filter(r => 
                  !r.includes('AI Confidence') && 
                  !r.includes('Market Regime') && 
                  !r.includes('ICT:') && 
                  !r.includes('SMC:') &&
                  !r.includes('1d:') &&
                  !r.includes('1h:') &&
                  !r.includes('15m:')
                )
                .slice(0, 5)
                .map((rationale, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-sm text-text-secondary">
                    <span className="text-accent-primary mt-1">•</span>
                    <span>{rationale}</span>
                  </li>
                ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
