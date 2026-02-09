"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { TradeStatistics, JournalAnalytics } from "@/types/journal";
import { getStatistics, getAnalytics } from "@/lib/journalApi";
import {
  TrendingUp,
  TrendingDown,
  Target,
  Award,
  Activity,
  Lock,
  Loader2,
} from "lucide-react";

interface JournalAnalyticsPanelProps {
  isPremium: boolean;
}

export function JournalAnalyticsPanel({ isPremium }: JournalAnalyticsPanelProps) {
  const [statistics, setStatistics] = useState<TradeStatistics | null>(null);
  const [analytics, setAnalytics] = useState<JournalAnalytics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isPremium) {
      loadAnalytics();
    }
  }, [isPremium]);

  const loadAnalytics = async () => {
    try {
      setIsLoading(true);
      const [statsData, analyticsData] = await Promise.all([
        getStatistics(),
        getAnalytics(),
      ]);
      setStatistics(statsData);
      setAnalytics(analyticsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load analytics");
    } finally {
      setIsLoading(false);
    }
  };

  if (!isPremium) {
    return (
      <Card className="bg-gradient-to-br from-bg-tertiary to-bg-secondary border-border-subtle">
        <CardContent className="p-8 text-center">
          <Lock className="h-12 w-12 text-accent-primary mx-auto mb-4" />
          <h3 className="text-h3 font-semibold text-text-primary mb-2">
            Premium Analytics
          </h3>
          <p className="text-text-secondary mb-4 max-w-sm mx-auto">
            Upgrade to Premium to unlock detailed trade analytics, performance insights,
            and psychology tracking.
          </p>
          <div className="space-y-3 text-left max-w-sm mx-auto">
            <div className="flex items-center gap-3 text-sm text-text-secondary">
              <Target className="h-4 w-4 text-accent-bullish" />
              Win rate by ICT pattern
            </div>
            <div className="flex items-center gap-3 text-sm text-text-secondary">
              <Activity className="h-4 w-4 text-accent-bullish" />
              R-multiple tracking
            </div>
            <div className="flex items-center gap-3 text-sm text-text-secondary">
              <Award className="h-4 w-4 text-accent-bullish" />
              Streaks and performance metrics
            </div>
          </div>
          <button className="mt-6 px-6 py-2 bg-accent-primary text-bg-primary font-medium rounded-sm hover:bg-accent-primary/90 transition-colors">
            Upgrade to Premium
          </button>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-64">
          <Loader2 className="h-6 w-6 animate-spin text-text-secondary" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-accent-bearish">
          {error}
        </CardContent>
      </Card>
    );
  }

  if (!statistics || statistics.total_trades === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-text-secondary">
          No closed trades yet. Start trading to see your analytics!
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-text-secondary text-sm">Win Rate</span>
              <Target className="h-4 w-4 text-text-tertiary" />
            </div>
            <div className="text-h2 font-bold text-text-primary">
              {statistics.win_rate.toFixed(1)}%
            </div>
            <Progress value={statistics.win_rate} max={100} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-text-secondary text-sm">Total P&L</span>
              {statistics.total_pnl >= 0 ? (
                <TrendingUp className="h-4 w-4 text-accent-bullish" />
              ) : (
                <TrendingDown className="h-4 w-4 text-accent-bearish" />
              )}
            </div>
            <div
              className={cn(
                "text-h2 font-bold",
                statistics.total_pnl >= 0 ? "text-accent-bullish" : "text-accent-bearish"
              )}
            >
              {statistics.total_pnl >= 0 ? "+" : ""}
              {formatCurrency(statistics.total_pnl)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-text-secondary text-sm">Profit Factor</span>
              <Activity className="h-4 w-4 text-text-tertiary" />
            </div>
            <div
              className={cn(
                "text-h2 font-bold",
                statistics.profit_factor >= 1.5
                  ? "text-accent-bullish"
                  : statistics.profit_factor >= 1
                  ? "text-accent-neutral"
                  : "text-accent-bearish"
              )}
            >
              {statistics.profit_factor.toFixed(2)}
            </div>
            <p className="text-xs text-text-tertiary mt-1">
              {statistics.profit_factor >= 1.5
                ? "Excellent"
                : statistics.profit_factor >= 1
                ? "Break-even"
                : "Needs improvement"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-text-secondary text-sm">Avg R-Multiple</span>
              <Award className="h-4 w-4 text-text-tertiary" />
            </div>
            <div
              className={cn(
                "text-h2 font-bold",
                statistics.avg_r_multiple >= 1
                  ? "text-accent-bullish"
                  : statistics.avg_r_multiple >= 0
                  ? "text-accent-neutral"
                  : "text-accent-bearish"
              )}
            >
              {statistics.avg_r_multiple >= 0 ? "+" : ""}
              {statistics.avg_r_multiple.toFixed(2)}R
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pattern Performance */}
      {statistics.win_rate_by_pattern &&
        Object.keys(statistics.win_rate_by_pattern).length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <h3 className="text-h3 font-semibold text-text-primary">
                Performance by ICT Pattern
              </h3>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {Object.entries(statistics.win_rate_by_pattern)
                  .sort(([, a], [, b]) => b - a)
                  .map(([pattern, winRate]) => (
                    <div key={pattern} className="flex items-center gap-4">
                      <span className="text-text-secondary text-sm w-40 truncate">
                        {pattern.replace(/_/g, " ")}
                      </span>
                      <div className="flex-1">
                        <Progress
                          value={winRate}
                          max={100}
                          variant={winRate >= 60 ? "bullish" : "neutral"}
                        />
                      </div>
                      <span
                        className={cn(
                          "text-sm font-mono w-16 text-right",
                          winRate >= 60 ? "text-accent-bullish" : "text-text-secondary"
                        )}
                      >
                        {winRate.toFixed(1)}%
                      </span>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        )}

      {/* Streaks */}
      {analytics?.streaks && (
        <Card>
          <CardHeader className="pb-3">
            <h3 className="text-h3 font-semibold text-text-primary">Streaks</h3>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-bg-tertiary rounded-sm">
                <div className="text-h2 font-bold text-accent-bullish">
                  {analytics.streaks.current_win_streak}
                </div>
                <p className="text-sm text-text-secondary">Current Win Streak</p>
              </div>
              <div className="text-center p-4 bg-bg-tertiary rounded-sm">
                <div className="text-h2 font-bold text-accent-bearish">
                  {analytics.streaks.current_loss_streak}
                </div>
                <p className="text-sm text-text-secondary">Current Loss Streak</p>
              </div>
              <div className="text-center p-4 bg-bg-tertiary rounded-sm">
                <div className="text-h2 font-bold text-accent-bullish">
                  {analytics.streaks.max_win_streak}
                </div>
                <p className="text-sm text-text-secondary">Max Win Streak</p>
              </div>
              <div className="text-center p-4 bg-bg-tertiary rounded-sm">
                <div className="text-h2 font-bold text-accent-bearish">
                  {analytics.streaks.max_loss_streak}
                </div>
                <p className="text-sm text-text-secondary">Max Loss Streak</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Top Performers */}
      {analytics?.top_performers && analytics.top_performers.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <h3 className="text-h3 font-semibold text-text-primary">Top Performers</h3>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {analytics.top_performers.map((symbol) => (
                <Badge key={symbol} variant="bullish">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  {symbol}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}
