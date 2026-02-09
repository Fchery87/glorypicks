"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Calculator, TrendingUp, Target, AlertCircle, DollarSign, Percent } from "lucide-react";

interface PositionCalculatorProps {
  signal?: {
    entry_price: number;
    stop_loss: number;
    take_profit: number;
    recommendation: string;
    strength: number;
  };
  className?: string;
}

interface PositionMetrics {
  position_size: number;
  risk_amount: number;
  risk_percentage: number;
  risk_reward_ratio: number;
  r_multiple: number;
  potential_profit: number;
  max_loss: number;
}

export function PositionCalculator({ signal, className }: PositionCalculatorProps) {
  const [accountBalance, setAccountBalance] = useState<number>(25000);
  const [riskPercent, setRiskPercent] = useState<number>(1.0);
  const [metrics, setMetrics] = useState<PositionMetrics | null>(null);

  useEffect(() => {
    if (signal && signal.entry_price && signal.stop_loss) {
      calculatePosition();
    }
  }, [signal, accountBalance, riskPercent]);

  const calculatePosition = () => {
    if (!signal || !signal.entry_price || !signal.stop_loss) return;

    const entryPrice = signal.entry_price;
    const stopLoss = signal.stop_loss;
    const takeProfit = signal.take_profit || entryPrice * 1.02;
    
    // Calculate stop distance
    const stopDistance = Math.abs(entryPrice - stopLoss);
    const stopDistancePercent = (stopDistance / entryPrice) * 100;
    
    // Risk amount
    const riskAmount = accountBalance * (riskPercent / 100);
    
    // Position size based on risk
    const positionSize = riskAmount / stopDistance;
    
    // Risk/Reward
    const rewardDistance = Math.abs(takeProfit - entryPrice);
    const riskRewardRatio = rewardDistance / stopDistance;
    
    // R-Multiple (how many R's of profit potential)
    const rMultiple = riskRewardRatio;
    
    // Potential outcomes
    const potentialProfit = positionSize * rewardDistance;
    const maxLoss = riskAmount;

    setMetrics({
      position_size: positionSize,
      risk_amount: riskAmount,
      risk_percentage: riskPercent,
      risk_reward_ratio: riskRewardRatio,
      r_multiple: rMultiple,
      potential_profit: potentialProfit,
      max_loss: maxLoss
    });
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  };

  const formatNumber = (value: number, decimals: number = 2) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    }).format(value);
  };

  const getRiskColor = (riskPercent: number) => {
    if (riskPercent <= 1) return "text-accent-bullish";
    if (riskPercent <= 2) return "text-yellow-500";
    return "text-accent-bearish";
  };

  const getRatioColor = (ratio: number) => {
    if (ratio >= 3) return "text-accent-bullish";
    if (ratio >= 2) return "text-yellow-500";
    return "text-accent-bearish";
  };

  if (!signal) {
    return (
      <Card className={cn("opacity-60", className)}>
        <CardContent className="p-6 text-center">
          <Calculator className="h-8 w-8 text-text-tertiary mx-auto mb-2" />
          <p className="text-text-secondary text-sm">
            Select a symbol to calculate position size
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("bg-gradient-to-br from-bg-tertiary to-bg-secondary", className)}>
      <CardHeader className="pb-4">
        <div className="flex items-center gap-2">
          <Calculator className="h-5 w-5 text-accent-primary" />
          <h3 className="text-h3 font-semibold text-text-primary">Position Calculator</h3>
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        {/* Account Balance Input */}
        <div className="space-y-2">
          <Label className="text-text-secondary text-sm flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            Account Balance
          </Label>
          <Input
            type="number"
            value={accountBalance}
            onChange={(e) => setAccountBalance(Number(e.target.value))}
            className="font-mono"
            min={1000}
            step={1000}
          />
        </div>

        {/* Risk Percentage Input */}
        <div className="space-y-2">
          <Label className="text-text-secondary text-sm flex items-center gap-2">
            <Percent className="h-4 w-4" />
            Risk Per Trade
          </Label>
          <div className="flex items-center gap-3">
            <Input
              type="number"
              value={riskPercent}
              onChange={(e) => setRiskPercent(Number(e.target.value))}
              className={cn("font-mono", getRiskColor(riskPercent))}
              min={0.1}
              max={5}
              step={0.1}
            />
            <span className="text-text-secondary">%</span>
          </div>
          <div className="flex gap-2">
            {[0.5, 1, 1.5, 2].map((risk) => (
              <button
                key={risk}
                onClick={() => setRiskPercent(risk)}
                className={cn(
                  "px-2 py-1 text-xs rounded transition-colors",
                  riskPercent === risk
                    ? "bg-accent-primary text-bg-primary"
                    : "bg-bg-elevated text-text-secondary hover:bg-bg-tertiary"
                )}
              >
                {risk}%
              </button>
            ))}
          </div>
        </div>

        {/* Signal Info */}
        {signal && (
          <div className="p-3 bg-bg-elevated rounded-sm space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-text-secondary text-xs">Entry Price</span>
              <span className="font-mono text-text-primary">
                {formatCurrency(signal.entry_price)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-text-secondary text-xs">Stop Loss</span>
              <span className="font-mono text-accent-bearish">
                {formatCurrency(signal.stop_loss)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-text-secondary text-xs">Take Profit</span>
              <span className="font-mono text-accent-bullish">
                {formatCurrency(signal.take_profit || signal.entry_price * 1.02)}
              </span>
            </div>
          </div>
        )}

        {/* Calculated Metrics */}
        {metrics && (
          <div className="space-y-3 pt-2 border-t border-border-subtle">
            {/* Position Size */}
            <div className="flex items-center justify-between">
              <span className="text-text-secondary text-sm">Position Size</span>
              <span className="font-mono text-lg text-text-primary">
                {formatNumber(metrics.position_size, 0)} shares
              </span>
            </div>

            {/* Risk Amount */}
            <div className="flex items-center justify-between">
              <span className="text-text-secondary text-sm">Risk Amount</span>
              <span className={cn("font-mono", getRiskColor(metrics.risk_percentage))}>
                {formatCurrency(metrics.risk_amount)} ({metrics.risk_percentage}%)
              </span>
            </div>

            {/* Risk/Reward */}
            <div className="flex items-center justify-between">
              <span className="text-text-secondary text-sm flex items-center gap-1">
                <TrendingUp className="h-3 w-3" />
                R:R Ratio
              </span>
              <Badge 
                variant="outline" 
                className={cn("font-mono", getRatioColor(metrics.risk_reward_ratio))}
              >
                1:{formatNumber(metrics.risk_reward_ratio, 1)}
              </Badge>
            </div>

            {/* R-Multiple */}
            <div className="flex items-center justify-between">
              <span className="text-text-secondary text-sm flex items-center gap-1">
                <Target className="h-3 w-3" />
                R-Multiple
              </span>
              <span className={cn("font-mono", getRatioColor(metrics.r_multiple))}>
                {formatNumber(metrics.r_multiple, 1)}R
              </span>
            </div>

            {/* Potential Outcomes */}
            <div className="mt-4 p-3 bg-bg-elevated rounded-sm space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-text-secondary text-xs flex items-center gap-1">
                  <TrendingUp className="h-3 w-3 text-accent-bullish" />
                  Potential Profit
                </span>
                <span className="font-mono text-accent-bullish">
                  +{formatCurrency(metrics.potential_profit)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-text-secondary text-xs flex items-center gap-1">
                  <AlertCircle className="h-3 w-3 text-accent-bearish" />
                  Max Loss
                </span>
                <span className="font-mono text-accent-bearish">
                  -{formatCurrency(metrics.max_loss)}
                </span>
              </div>
            </div>

            {/* Risk Warning */}
            {metrics.risk_percentage > 2 && (
              <div className="flex items-start gap-2 p-2 bg-accent-bearish/10 rounded-sm">
                <AlertCircle className="h-4 w-4 text-accent-bearish flex-shrink-0 mt-0.5" />
                <p className="text-xs text-accent-bearish">
                  Risk exceeds 2%. Consider reducing position size to maintain proper risk management.
                </p>
              </div>
            )}

            {/* Low R:R Warning */}
            {metrics.risk_reward_ratio < 2 && (
              <div className="flex items-start gap-2 p-2 bg-yellow-500/10 rounded-sm">
                <AlertCircle className="h-4 w-4 text-yellow-500 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-yellow-500">
                  Risk/Reward below 1:2. Consider waiting for a better setup or adjusting targets.
                </p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
