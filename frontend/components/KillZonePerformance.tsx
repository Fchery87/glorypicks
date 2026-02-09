"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { 
  TrendingUp, 
  TrendingDown, 
  Target, 
  Clock, 
  Award, 
  AlertCircle,
  Activity
} from "lucide-react";

interface ZoneStats {
  total_trades: number;
  win_rate: number;
  avg_return_percent: number;
  avg_duration_minutes: number;
  best_pattern: string;
  worst_pattern: string;
}

interface ZoneRecommendation {
  zone_type: string;
  recommendation: string;
  confidence: number;
  message: string;
  statistics: ZoneStats | null;
  is_best_zone: boolean;
  is_worst_zone: boolean;
}

interface KillZonePerformanceData {
  symbol: string;
  optimal_session: string;
  overall_best_zone: string;
  overall_worst_zone: string;
  zone_recommendations: Record<string, ZoneRecommendation>;
}

interface KillZonePerformanceProps {
  symbol: string;
  className?: string;
}

export function KillZonePerformance({ symbol, className }: KillZonePerformanceProps) {
  const [data, setData] = useState<KillZonePerformanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!symbol) return;
    
    const fetchPerformance = async () => {
      try {
        setLoading(true);
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
        const response = await fetch(`${apiUrl}/killzone/performance/${symbol}`);
        
        if (!response.ok) {
          throw new Error("Failed to fetch performance data");
        }
        
        const result = await response.json();
        setData(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    };

    fetchPerformance();
  }, [symbol]);

  const formatZoneName = (zoneType: string) => {
    return zoneType
      .replace(/_/g, " ")
      .replace(/\b\w/g, (l) => l.toUpperCase());
  };

  const getRecommendationColor = (recommendation: string) => {
    switch (recommendation) {
      case "strong_buy":
        return "text-accent-bullish";
      case "favorable":
        return "text-green-400";
      case "neutral":
        return "text-yellow-500";
      case "avoid":
        return "text-accent-bearish";
      default:
        return "text-text-secondary";
    }
  };

  const getRecommendationBadge = (recommendation: string) => {
    const styles = {
      strong_buy: "bg-accent-bullish/20 text-accent-bullish border-accent-bullish/50",
      favorable: "bg-green-500/20 text-green-400 border-green-500/50",
      neutral: "bg-yellow-500/20 text-yellow-500 border-yellow-500/50",
      avoid: "bg-accent-bearish/20 text-accent-bearish border-accent-bearish/50",
      insufficient_data: "bg-text-secondary/20 text-text-secondary",
      limited_data: "bg-text-secondary/20 text-text-secondary",
    };
    
    return styles[recommendation as keyof typeof styles] || styles.insufficient_data;
  };

  if (loading) {
    return (
      <Card className={cn("opacity-60", className)}>
        <CardContent className="p-6 text-center">
          <Activity className="h-6 w-6 animate-pulse text-text-tertiary mx-auto" />
          <p className="text-text-secondary text-sm mt-2">Loading performance data...</p>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={cn("border-accent-bearish/50", className)}>
        <CardContent className="p-6 text-center">
          <AlertCircle className="h-6 w-6 text-accent-bearish mx-auto" />
          <p className="text-accent-bearish text-sm mt-2">Failed to load performance data</p>
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return (
      <Card className={className}>
        <CardContent className="p-6 text-center text-text-secondary">
          No performance data available
        </CardContent>
      </Card>
    );
  }

  const zones = Object.entries(data.zone_recommendations);

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Target className="h-5 w-5 text-accent-primary" />
            <h3 className="text-h3 font-semibold text-text-primary">
              Kill Zone Performance
            </h3>
          </div>
          <Badge variant="outline" className="font-mono text-xs">
            {symbol}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Overall Stats */}
        <div className="p-4 bg-bg-elevated rounded-lg space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-text-secondary text-sm">Optimal Session</span>
            <span className="font-medium text-text-primary">
              {data.optimal_session && formatZoneName(data.optimal_session)}
            </span>
          </div>
          
          {data.overall_best_zone && (
            <div className="flex items-center justify-between">
              <span className="text-text-secondary text-sm">Best Zone</span>
              <Badge className="bg-accent-bullish/20 text-accent-bullish">
                <Award className="h-3 w-3 mr-1" />
                {formatZoneName(data.overall_best_zone)}
              </Badge>
            </div>
          )}
          
          {data.overall_worst_zone && (
            <div className="flex items-center justify-between">
              <span className="text-text-secondary text-sm">Worst Zone</span>
              <Badge className="bg-accent-bearish/20 text-accent-bearish">
                <AlertCircle className="h-3 w-3 mr-1" />
                {formatZoneName(data.overall_worst_zone)}
              </Badge>
            </div>
          )}
        </div>

        {/* Zone Breakdown */}
        <Tabs defaultValue={zones[0]?.[0]} className="w-full">
          <TabsList className="grid grid-cols-2 lg:grid-cols-4">
            {zones.map(([zoneType]) => (
              <TabsTrigger key={zoneType} value={zoneType} className="text-xs">
                {formatZoneName(zoneType).split(" ")[0]}
              </TabsTrigger>
            ))}
          </TabsList>

          {zones.map(([zoneType, zoneData]) => (
            <TabsContent key={zoneType} value={zoneType}>
              <div className="space-y-4">
                {/* Recommendation */}
                <div className="flex items-center justify-between p-3 bg-bg-elevated rounded">
                  <span className="text-text-secondary text-sm">Recommendation</span>
                  <Badge className={getRecommendationBadge(zoneData.recommendation)}>
                    {zoneData.recommendation.replace(/_/g, " ").toUpperCase()}
                  </Badge>
                </div>

                <p className={cn("text-sm", getRecommendationColor(zoneData.recommendation))}>
                  {zoneData.message}
                </p>

                {/* Statistics */}
                {zoneData.statistics && (
                  <div className="space-y-3 pt-2">
                    {/* Win Rate */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-text-secondary">Win Rate</span>
                        <span className={cn(
                          "font-mono font-medium",
                          zoneData.statistics.win_rate >= 60 ? "text-accent-bullish" :
                          zoneData.statistics.win_rate >= 50 ? "text-yellow-500" :
                          "text-accent-bearish"
                        )}>
                          {zoneData.statistics.win_rate}%
                        </span>
                      </div>
                      <Progress 
                        value={zoneData.statistics.win_rate} 
                        max={100}
                        className={cn(
                          "h-1.5",
                          zoneData.statistics.win_rate >= 60 ? "bg-accent-bullish" :
                          zoneData.statistics.win_rate >= 50 ? "bg-yellow-500" :
                          "bg-accent-bearish"
                        )}
                      />
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 gap-3 pt-2">
                      <div className="p-2 bg-bg-elevated rounded">
                        <div className="flex items-center gap-1 text-text-tertiary text-xs mb-1">
                          <TrendingUp className="h-3 w-3" />
                          Total Trades
                        </div>
                        <span className="font-mono text-lg">
                          {zoneData.statistics.total_trades}
                        </span>
                      </div>

                      <div className="p-2 bg-bg-elevated rounded">
                        <div className="flex items-center gap-1 text-text-tertiary text-xs mb-1">
                          <TrendingDown className="h-3 w-3" />
                          Avg Return
                        </div>
                        <span className={cn(
                          "font-mono text-lg",
                          zoneData.statistics.avg_return_percent >= 0 ? "text-accent-bullish" : "text-accent-bearish"
                        )}>
                          {zoneData.statistics.avg_return_percent >= 0 ? "+" : ""}
                          {zoneData.statistics.avg_return_percent}%
                        </span>
                      </div>

                      <div className="p-2 bg-bg-elevated rounded">
                        <div className="flex items-center gap-1 text-text-tertiary text-xs mb-1">
                          <Clock className="h-3 w-3" />
                          Avg Duration
                        </div>
                        <span className="font-mono text-lg">
                          {Math.round(zoneData.statistics.avg_duration_minutes)}m
                        </span>
                      </div>

                      <div className="p-2 bg-bg-elevated rounded">
                        <div className="flex items-center gap-1 text-text-tertiary text-xs mb-1">
                          <Target className="h-3 w-3" />
                          Best Pattern
                        </div>
                        <span className="font-mono text-sm truncate">
                          {zoneData.statistics.best_pattern || "N/A"}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Badges */}
                <div className="flex gap-2 pt-2">
                  {zoneData.is_best_zone && (
                    <Badge className="bg-accent-bullish/20 text-accent-bullish">
                      <Award className="h-3 w-3 mr-1" />
                      Best Zone
                    </Badge>
                  )}
                  {zoneData.is_worst_zone && (
                    <Badge className="bg-accent-bearish/20 text-accent-bearish">
                      <AlertCircle className="h-3 w-3 mr-1" />
                      Worst Zone
                    </Badge>
                  )}
                </div>
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  );
}
