"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { TradeEntry, TradeFormData, UserTierLimits, ICTPatternType, EmotionalState } from "@/types/journal";
import {
  getTrades,
  createTrade,
  updateTrade,
  closeTrade,
  deleteTrade,
  getTierLimits,
  createSampleTrades,
  getPatternOptions,
} from "@/lib/journalApi";
import {
  Plus,
  TrendingUp,
  TrendingDown,
  Trash2,
  Edit3,
  X,
  BookOpen,
  Lock,
  Sparkles,
  Loader2,
} from "lucide-react";
import { JournalAnalyticsPanel } from "@/components/JournalAnalyticsPanel";

export default function JournalPage() {
  const [trades, setTrades] = useState<TradeEntry[]>([]);
  const [tierLimits, setTierLimits] = useState<UserTierLimits | null>(null);
  const [patternOptions, setPatternOptions] = useState<{
    patterns: { value: string; label: string }[];
    emotions: { value: string; label: string }[];
    directions: { value: string; label: string }[];
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState("all");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingTrade, setEditingTrade] = useState<TradeEntry | null>(null);
  const [isClosingTrade, setIsClosingTrade] = useState<TradeEntry | null>(null);

  const [formData, setFormData] = useState<TradeFormData>({
    symbol: "",
    direction: "long",
    entry_price: "",
    position_size: "",
    stop_loss: "",
    take_profit: "",
    ict_pattern: undefined,
    timeframe: "1h",
    signal_strength: 70,
    emotional_state: undefined,
    pre_trade_notes: "",
    tags: [],
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [tradesData, limitsData, patternsData] = await Promise.all([
        getTrades(),
        getTierLimits(),
        getPatternOptions(),
      ]);
      setTrades(tradesData);
      setTierLimits(limitsData);
      setPatternOptions(patternsData);
    } catch (error) {
      console.error("Error loading journal data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateTrade = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      await createTrade({
        ...formData,
        entry_price: parseFloat(formData.entry_price),
        position_size: parseFloat(formData.position_size),
        stop_loss: formData.stop_loss ? parseFloat(formData.stop_loss) : undefined,
        take_profit: formData.take_profit ? parseFloat(formData.take_profit) : undefined,
      });

      setIsCreateDialogOpen(false);
      resetForm();
      await loadData();
    } catch (error) {
      console.error("Error creating trade:", error);
      alert(error instanceof Error ? error.message : "Failed to create trade");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCloseTrade = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isClosingTrade) return;

    setIsSubmitting(true);
    try {
      const form = e.target as HTMLFormElement;
      const exitPrice = parseFloat((form.elements.namedItem("exit_price") as HTMLInputElement).value);
      const notes = (form.elements.namedItem("post_trade_notes") as HTMLTextAreaElement)?.value;

      await closeTrade(isClosingTrade.id, {
        exit_price: exitPrice,
        post_trade_notes: notes,
      });

      setIsClosingTrade(null);
      await loadData();
    } catch (error) {
      console.error("Error closing trade:", error);
      alert(error instanceof Error ? error.message : "Failed to close trade");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteTrade = async (tradeId: string) => {
    if (!confirm("Are you sure you want to delete this trade?")) return;

    try {
      await deleteTrade(tradeId);
      await loadData();
    } catch (error) {
      console.error("Error deleting trade:", error);
    }
  };

  const handleCreateSampleTrades = async () => {
    try {
      await createSampleTrades();
      await loadData();
    } catch (error) {
      console.error("Error creating sample trades:", error);
    }
  };

  const resetForm = () => {
    setFormData({
      symbol: "",
      direction: "long",
      entry_price: "",
      position_size: "",
      stop_loss: "",
      take_profit: "",
      ict_pattern: undefined,
      timeframe: "1h",
      signal_strength: 70,
      emotional_state: undefined,
      pre_trade_notes: "",
      tags: [],
    });
  };

  const filteredTrades = trades.filter((trade) => {
    if (activeTab === "open") return trade.status === "open";
    if (activeTab === "closed") return trade.status === "closed";
    return true;
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-bg-primary flex items-center justify-center">
        <div className="flex items-center gap-3 text-text-secondary">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Loading journal...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg-primary">
      <div className="p-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-h1 font-bold text-text-primary flex items-center gap-3">
              <BookOpen className="h-8 w-8 text-accent-primary" />
              Trade Journal
            </h1>
            <p className="text-text-secondary mt-1">
              Track your ICT trades and improve your edge
            </p>
          </div>

          <div className="flex items-center gap-4">
            {/* Tier Indicator */}
            {tierLimits && (
              <div className="flex items-center gap-2 bg-bg-tertiary rounded-md px-4 py-2">
                {tierLimits.is_premium ? (
                  <>
                    <Sparkles className="h-4 w-4 text-accent-bullish" />
                    <span className="text-sm text-text-primary font-medium">Premium</span>
                  </>
                ) : (
                  <>
                    <span className="text-sm text-text-secondary">
                      Free Tier: {tierLimits.trades_remaining} trades remaining
                    </span>
                    <Progress
                      value={(10 - tierLimits.trades_remaining) * 10}
                      max={100}
                      className="w-24"
                    />
                  </>
                )}
              </div>
            )}

            <Button
              onClick={() => setIsCreateDialogOpen(true)}
              disabled={tierLimits?.trades_remaining === 0}
            >
              <Plus className="h-4 w-4 mr-2" />
              New Trade
            </Button>
          </div>
        </div>

        {/* Main Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="all">
              All Trades ({trades.length})
            </TabsTrigger>
            <TabsTrigger value="open">
              Open ({trades.filter((t) => t.status === "open").length})
            </TabsTrigger>
            <TabsTrigger value="closed">
              Closed ({trades.filter((t) => t.status === "closed").length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab}>
            {filteredTrades.length === 0 ? (
              <Card className="py-12">
                <CardContent className="flex flex-col items-center justify-center text-center">
                  <BookOpen className="h-12 w-12 text-text-tertiary mb-4" />
                  <h3 className="text-h3 font-semibold text-text-primary mb-2">
                    No trades yet
                  </h3>
                  <p className="text-text-secondary mb-6 max-w-md">
                    Start tracking your ICT trades to analyze your performance and improve your edge.
                  </p>
                  <div className="flex gap-3">
                    <Button onClick={() => setIsCreateDialogOpen(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Your First Trade
                    </Button>
                    <Button
                      variant="outline"
                      onClick={handleCreateSampleTrades}
                      disabled={isSubmitting}
                    >
                      Load Demo Trades
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {filteredTrades.map((trade) => (
                  <Card
                    key={trade.id}
                    className={cn(
                      "hover:bg-bg-tertiary/50 transition-colors",
                      trade.status === "open" && "border-l-4 border-l-accent-bullish"
                    )}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        {/* Left: Trade Info */}
                        <div className="space-y-2">
                          <div className="flex items-center gap-3">
                            <span className="text-h3 font-mono font-bold text-text-primary">
                              {trade.symbol}
                            </span>
                            <Badge
                              variant={trade.direction === "long" ? "bullish" : "bearish"}
                            >
                              {trade.direction === "long" ? (
                                <TrendingUp className="h-3 w-3 mr-1" />
                              ) : (
                                <TrendingDown className="h-3 w-3 mr-1" />
                              )}
                              {trade.direction.toUpperCase()}
                            </Badge>
                            <Badge variant={trade.status === "open" ? "default" : "secondary"}>
                              {trade.status}
                            </Badge>
                          </div>

                          <div className="flex items-center gap-4 text-sm text-text-secondary">
                            <span>Entry: {formatCurrency(trade.entry_price)}</span>
                            {trade.exit_price && (
                              <span>Exit: {formatCurrency(trade.exit_price)}</span>
                            )}
                            <span>Size: {trade.position_size} shares</span>
                            {trade.ict_pattern && (
                              <Badge variant="outline" className="text-xs">
                                {trade.ict_pattern.replace(/_/g, " ")}
                              </Badge>
                            )}
                          </div>

                          {trade.pre_trade_notes && (
                            <p className="text-sm text-text-tertiary max-w-xl">
                              {trade.pre_trade_notes}
                            </p>
                          )}
                        </div>

                        {/* Right: P&L and Actions */}
                        <div className="flex items-center gap-6">
                          {/* P&L Display */}
                          {trade.pnl_dollar !== undefined && (
                            <div className="text-right">
                              <div
                                className={cn(
                                  "text-data-lg font-mono font-bold",
                                  trade.pnl_dollar >= 0 ? "text-accent-bullish" : "text-accent-bearish"
                                )}
                              >
                                {trade.pnl_dollar >= 0 ? "+" : ""}
                                {formatCurrency(trade.pnl_dollar)}
                              </div>
                              <div
                                className={cn(
                                  "text-sm font-mono",
                                  trade.pnl_percent && trade.pnl_percent >= 0
                                    ? "text-accent-bullish"
                                    : "text-accent-bearish"
                                )}
                              >
                                {trade.pnl_percent && trade.pnl_percent >= 0 ? "+" : ""}
                                {trade.pnl_percent?.toFixed(2)}%
                              </div>
                              {trade.r_multiple !== undefined && (
                                <div className="text-xs text-text-tertiary">
                                  {trade.r_multiple >= 0 ? "+" : ""}
                                  {trade.r_multiple.toFixed(2)}R
                                </div>
                              )}
                            </div>
                          )}

                          {/* Actions */}
                          <div className="flex items-center gap-2">
                            {trade.status === "open" && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setIsClosingTrade(trade)}
                              >
                                Close
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteTrade(trade.id)}
                            >
                              <Trash2 className="h-4 w-4 text-accent-bearish" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Analytics Section */}
        {trades.length > 0 && (
          <div className="mt-8">
            <h2 className="text-h2 font-semibold text-text-primary mb-6">
              Performance Analytics
            </h2>
            <JournalAnalyticsPanel isPremium={tierLimits?.is_premium || false} />
          </div>
        )}
      </div>

      {/* Create Trade Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New Trade Entry</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleCreateTrade} className="space-y-6">
            {/* Basic Info */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="symbol">Symbol *</Label>
                <Input
                  id="symbol"
                  value={formData.symbol}
                  onChange={(e) =>
                    setFormData({ ...formData, symbol: e.target.value.toUpperCase() })
                  }
                  placeholder="AAPL"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="direction">Direction *</Label>
                <Select
                  value={formData.direction}
                  onValueChange={(value: "long" | "short") =>
                    setFormData({ ...formData, direction: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="long">Long</SelectItem>
                    <SelectItem value="short">Short</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Prices */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="entry_price">Entry Price *</Label>
                <Input
                  id="entry_price"
                  type="number"
                  step="0.01"
                  value={formData.entry_price}
                  onChange={(e) =>
                    setFormData({ ...formData, entry_price: e.target.value })
                  }
                  placeholder="150.00"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="position_size">Position Size *</Label>
                <Input
                  id="position_size"
                  type="number"
                  value={formData.position_size}
                  onChange={(e) =>
                    setFormData({ ...formData, position_size: e.target.value })
                  }
                  placeholder="100"
                  required
                />
              </div>
            </div>

            {/* Risk Management */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="stop_loss">Stop Loss</Label>
                <Input
                  id="stop_loss"
                  type="number"
                  step="0.01"
                  value={formData.stop_loss}
                  onChange={(e) =>
                    setFormData({ ...formData, stop_loss: e.target.value })
                  }
                  placeholder="145.00"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="take_profit">Take Profit</Label>
                <Input
                  id="take_profit"
                  type="number"
                  step="0.01"
                  value={formData.take_profit}
                  onChange={(e) =>
                    setFormData({ ...formData, take_profit: e.target.value })
                  }
                  placeholder="160.00"
                />
              </div>
            </div>

            {/* ICT Analysis */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="ict_pattern">ICT Pattern</Label>
                <Select
                  value={formData.ict_pattern}
                  onValueChange={(value: ICTPatternType) =>
                    setFormData({ ...formData, ict_pattern: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select pattern..." />
                  </SelectTrigger>
                  <SelectContent>
                    {patternOptions?.patterns.map((pattern) => (
                      <SelectItem key={pattern.value} value={pattern.value}>
                        {pattern.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="timeframe">Timeframe</Label>
                <Select
                  value={formData.timeframe}
                  onValueChange={(value) =>
                    setFormData({ ...formData, timeframe: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="15m">15 Minutes</SelectItem>
                    <SelectItem value="1h">1 Hour</SelectItem>
                    <SelectItem value="4h">4 Hours</SelectItem>
                    <SelectItem value="1d">Daily</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Signal Strength */}
            <div className="space-y-2">
              <Label htmlFor="signal_strength">
                Signal Strength: {formData.signal_strength}%
              </Label>
              <Input
                id="signal_strength"
                type="range"
                min="0"
                max="100"
                value={formData.signal_strength}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    signal_strength: parseInt(e.target.value),
                  })
                }
              />
            </div>

            {/* Emotional State (Premium Feature) */}
            {tierLimits?.can_tag_emotions ? (
              <div className="space-y-2">
                <Label htmlFor="emotional_state">Emotional State</Label>
                <Select
                  value={formData.emotional_state}
                  onValueChange={(value: EmotionalState) =>
                    setFormData({ ...formData, emotional_state: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="How are you feeling?" />
                  </SelectTrigger>
                  <SelectContent>
                    {patternOptions?.emotions.map((emotion) => (
                      <SelectItem key={emotion.value} value={emotion.value}>
                        {emotion.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-text-tertiary text-sm">
                <Lock className="h-4 w-4" />
                <span>Emotional state tracking is a Premium feature</span>
              </div>
            )}

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="pre_trade_notes">Pre-Trade Notes</Label>
              <Textarea
                id="pre_trade_notes"
                value={formData.pre_trade_notes}
                onChange={(e) =>
                  setFormData({ ...formData, pre_trade_notes: e.target.value })
                }
                placeholder="Why are you taking this trade? What's your plan?"
                rows={3}
              />
            </div>

            {/* Submit */}
            <div className="flex justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsCreateDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  "Create Trade"
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Close Trade Dialog */}
      <Dialog open={!!isClosingTrade} onOpenChange={() => setIsClosingTrade(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Close Trade</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleCloseTrade} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="exit_price">Exit Price *</Label>
              <Input
                id="exit_price"
                name="exit_price"
                type="number"
                step="0.01"
                placeholder="Enter exit price"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="post_trade_notes">Post-Trade Notes</Label>
              <Textarea
                id="post_trade_notes"
                name="post_trade_notes"
                placeholder="What did you learn? What would you do differently?"
                rows={3}
              />
            </div>

            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => setIsClosingTrade(null)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Closing...
                  </>
                ) : (
                  "Close Trade"
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
