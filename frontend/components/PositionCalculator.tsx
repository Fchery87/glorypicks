'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { Calculator, TrendingUp, Target, AlertCircle, DollarSign, Percent, Shield, Zap } from 'lucide-react';

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

    const stopDistance = Math.abs(entryPrice - stopLoss);
    const riskAmount = accountBalance * (riskPercent / 100);
    const positionSize = riskAmount / stopDistance;
    const rewardDistance = Math.abs(takeProfit - entryPrice);
    const riskRewardRatio = rewardDistance / stopDistance;
    const rMultiple = riskRewardRatio;
    const potentialProfit = positionSize * rewardDistance;
    const maxLoss = riskAmount;

    setMetrics({
      position_size: positionSize,
      risk_amount: riskAmount,
      risk_percentage: riskPercent,
      risk_reward_ratio: riskRewardRatio,
      r_multiple: rMultiple,
      potential_profit: potentialProfit,
      max_loss: maxLoss,
    });
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const formatNumber = (value: number, decimals: number = 2) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(value);
  };

  const getRiskColor = (riskPercent: number) => {
    if (riskPercent <= 1) return 'text-accent-bullish';
    if (riskPercent <= 2) return 'text-accent-amber';
    return 'text-accent-bearish';
  };

  const getRatioColor = (ratio: number) => {
    if (ratio >= 3) return 'text-accent-bullish';
    if (ratio >= 2) return 'text-accent-amber';
    return 'text-accent-bearish';
  };

  if (!signal) {
    return (
      <Card className={cn('opacity-60', className)}>
        <CardContent className="p-6 text-center">
          <Calculator className="h-8 w-8 text-text-tertiary mx-auto mb-2" />
          <p className="text-text-secondary text-sm">Select a symbol to calculate position size</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn('relative overflow-hidden', className)}>
      <div
        aria-hidden
        className="pointer-events-none absolute -top-16 -left-16 h-48 w-48 rounded-full bg-accent-primary/8 blur-3xl"
      />
      <CardHeader className="relative z-10 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-md border border-accent-primary/30 bg-accent-primary/10 text-accent-primary">
            <Calculator className="h-4 w-4" />
          </div>
          <div>
            <p className="section-eyebrow">Risk desk</p>
            <h3 className="text-h3 font-semibold text-text-primary tracking-[-0.015em]">
              Position Calculator
            </h3>
          </div>
        </div>
      </CardHeader>

      <CardContent className="relative z-10 space-y-5">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="flex items-center gap-1.5 text-text-tertiary">
              <DollarSign className="h-3.5 w-3.5" />
              Account
            </Label>
            <Input
              type="number"
              value={accountBalance}
              onChange={(e) => setAccountBalance(Number(e.target.value))}
              className="font-mono h-9"
              min={1000}
              step={1000}
            />
          </div>

          <div className="space-y-1.5">
            <Label className="flex items-center gap-1.5 text-text-tertiary">
              <Percent className="h-3.5 w-3.5" />
              Risk
            </Label>
            <div className="flex items-center gap-1.5">
              <Input
                type="number"
                value={riskPercent}
                onChange={(e) => setRiskPercent(Number(e.target.value))}
                className={cn('font-mono h-9', getRiskColor(riskPercent))}
                min={0.1}
                max={5}
                step={0.1}
              />
              <span className="text-text-tertiary text-sm font-mono">%</span>
            </div>
          </div>
        </div>

        <div className="flex gap-1.5">
          {[0.5, 1, 1.5, 2].map((risk) => (
            <button
              key={risk}
              onClick={() => setRiskPercent(risk)}
              className={cn(
                'flex-1 rounded-md border px-2 py-1.5 text-[11px] font-mono transition-all',
                riskPercent === risk
                  ? 'bg-accent-primary/15 text-accent-primary border-accent-primary/35'
                  : 'bg-bg-tertiary/60 text-text-tertiary hover:bg-bg-tertiary border-border-subtle hover:text-text-secondary'
              )}
            >
              {risk}%
            </button>
          ))}
        </div>

        {signal && (
          <div className="rounded-xl border border-border-subtle bg-bg-tertiary/40 p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-text-tertiary uppercase tracking-[0.14em] font-mono">
                Entry
              </span>
              <span className="font-mono text-sm text-text-primary tabular-nums">
                {formatCurrency(signal.entry_price)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-text-tertiary uppercase tracking-[0.14em] font-mono">
                Stop
              </span>
              <span className="font-mono text-sm text-accent-bearish tabular-nums">
                {formatCurrency(signal.stop_loss)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-text-tertiary uppercase tracking-[0.14em] font-mono">
                Target
              </span>
              <span className="font-mono text-sm text-accent-bullish tabular-nums">
                {formatCurrency(signal.take_profit || signal.entry_price * 1.02)}
              </span>
            </div>
          </div>
        )}

        {metrics && (
          <div className="space-y-3 pt-2 border-t border-border-subtle">
            <div className="flex items-center justify-between rounded-lg border border-border-subtle bg-bg-tertiary/40 px-3 py-2.5">
              <span className="text-text-secondary text-xs flex items-center gap-1.5">
                <Zap className="h-3.5 w-3.5 text-accent-primary" />
                Position size
              </span>
              <span className="font-mono text-base text-text-primary tabular-nums">
                {formatNumber(metrics.position_size, 0)}{' '}
                <span className="text-xs text-text-tertiary">shares</span>
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-lg border border-border-subtle bg-bg-tertiary/40 p-2.5">
                <p className="text-[10px] text-text-tertiary uppercase tracking-[0.14em] font-mono mb-1 flex items-center gap-1">
                  <Shield className="h-3 w-3" />
                  R:R
                </p>
                <p
                  className={cn(
                    'font-mono text-base tabular-nums',
                    getRatioColor(metrics.risk_reward_ratio)
                  )}
                >
                  1:{formatNumber(metrics.risk_reward_ratio, 1)}
                </p>
              </div>
              <div className="rounded-lg border border-border-subtle bg-bg-tertiary/40 p-2.5">
                <p className="text-[10px] text-text-tertiary uppercase tracking-[0.14em] font-mono mb-1 flex items-center gap-1">
                  <Target className="h-3 w-3" />
                  R-multiple
                </p>
                <p
                  className={cn(
                    'font-mono text-base tabular-nums',
                    getRatioColor(metrics.r_multiple)
                  )}
                >
                  {formatNumber(metrics.r_multiple, 1)}R
                </p>
              </div>
            </div>

            <div className="rounded-xl border border-border-subtle bg-bg-tertiary/30 p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-text-secondary text-xs flex items-center gap-1.5">
                  <TrendingUp className="h-3.5 w-3.5 text-accent-bullish" />
                  Potential profit
                </span>
                <span className="font-mono text-sm text-accent-bullish tabular-nums">
                  +{formatCurrency(metrics.potential_profit)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-text-secondary text-xs flex items-center gap-1.5">
                  <AlertCircle className="h-3.5 w-3.5 text-accent-bearish" />
                  Max loss
                </span>
                <span className="font-mono text-sm text-accent-bearish tabular-nums">
                  -{formatCurrency(metrics.max_loss)}
                </span>
              </div>
            </div>

            {metrics.risk_percentage > 2 && (
              <div className="flex items-start gap-2 p-2.5 bg-accent-bearish/10 border border-accent-bearish/30 rounded-lg">
                <AlertCircle className="h-4 w-4 text-accent-bearish flex-shrink-0 mt-0.5" />
                <p className="text-[11px] text-accent-bearish">
                  Risk exceeds 2%. Consider reducing position size for proper risk management.
                </p>
              </div>
            )}

            {metrics.risk_reward_ratio < 2 && (
              <div className="flex items-start gap-2 p-2.5 bg-accent-amber/10 border border-accent-amber/30 rounded-lg">
                <AlertCircle className="h-4 w-4 text-accent-amber flex-shrink-0 mt-0.5" />
                <p className="text-[11px] text-accent-amber">
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
