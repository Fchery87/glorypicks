'use client';

import { useRef, useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { useStore } from '@/lib/store';
import {
  TradeEntry,
  TradeFormData,
  UserTierLimits,
  ICTPatternType,
  EmotionalState,
  JournalImportResult,
  JournalReviewMetrics,
  JournalTradeFilters,
} from '@/types/journal';
import {
  getTrades,
  createTrade,
  closeTrade,
  deleteTrade,
  getTierLimits,
  createSampleTrades,
  getPatternOptions,
  getReviewMetrics,
  importTrades,
  exportTrades,
} from '@/lib/journalApi';
import {
  Plus,
  TrendingUp,
  TrendingDown,
  Trash2,
  BookOpen,
  Lock,
  Sparkles,
  Loader2,
  Upload,
  Download,
  Filter,
} from 'lucide-react';
import { JournalAnalyticsPanel } from '@/components/JournalAnalyticsPanel';

export default function JournalPage() {
  const currentTimeframe = useStore((state) => state.timeframe);
  const currentCandles = useStore((state) => state.candles);
  const currentSignal = useStore((state) => state.signal);
  const currentICTMap = useStore((state) => state.ictMap);
  const [trades, setTrades] = useState<TradeEntry[]>([]);
  const [tierLimits, setTierLimits] = useState<UserTierLimits | null>(null);
  const [patternOptions, setPatternOptions] = useState<{
    patterns: { value: string; label: string }[];
    emotions: { value: string; label: string }[];
    directions: { value: string; label: string }[];
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isClosingTrade, setIsClosingTrade] = useState<TradeEntry | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<JournalImportResult | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [reviewMetrics, setReviewMetrics] = useState<JournalReviewMetrics | null>(null);
  const [filters, setFilters] = useState<JournalTradeFilters>({});
  const [filterTag, setFilterTag] = useState('');
  const [reviewError, setReviewError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState<TradeFormData>({
    symbol: '',
    direction: 'long',
    entry_price: '',
    position_size: '',
    stop_loss: '',
    take_profit: '',
    ict_pattern: undefined,
    timeframe: '1h',
    signal_strength: 70,
    emotional_state: undefined,
    pre_trade_notes: '',
    tags: [],
    checklist: [
      { key: 'htf_bias', label: 'Higher-timeframe bias is clear', passed: false },
      { key: 'liquidity', label: 'Liquidity target is identified', passed: false },
      { key: 'risk_defined', label: 'Risk and invalidation are defined', passed: false },
    ],
    linked_signal_id: '',
    screenshots: [],
  });

  useEffect(() => {
    loadData();
  }, [activeTab, filters]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const requestFilters = { ...filters, status: activeTab === 'all' ? undefined : activeTab };
      const [tradesData, limitsData, patternsData] = await Promise.all([
        getTrades(requestFilters),
        getTierLimits(),
        getPatternOptions(),
      ]);
      setTrades(tradesData);
      setTierLimits(limitsData);
      setPatternOptions(patternsData);
      if (limitsData.is_premium) {
        try {
          setReviewMetrics(await getReviewMetrics(requestFilters));
          setReviewError(null);
        } catch (error) {
          setReviewMetrics(null);
          setReviewError(error instanceof Error ? error.message : 'Unable to load review metrics');
        }
      } else {
        setReviewMetrics(null);
      }
    } catch (error) {
      console.error('Error loading journal data:', error);
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
        checklist: formData.checklist,
        linked_signal_id: formData.linked_signal_id || undefined,
        screenshots: formData.screenshots,
        initial_signal:
          currentSignal && currentSignal.symbol === formData.symbol.toUpperCase()
            ? {
                phase: 'entry',
                source_signal_id: formData.linked_signal_id || undefined,
                symbol: currentSignal.symbol,
                recommendation: currentSignal.recommendation,
                strength: currentSignal.strength,
                rationale: currentSignal.rationale ?? [],
                key_levels: currentSignal.key_levels ?? {},
              }
            : undefined,
        chart_snapshot:
          currentSignal && currentSignal.symbol === formData.symbol.toUpperCase()
            ? {
                schema_version: 1,
                symbol: formData.symbol.toUpperCase(),
                timeframe: currentTimeframe,
                captured_at: new Date().toISOString(),
                candles: (currentCandles[currentTimeframe] ?? []).slice(-500),
                annotations: (currentICTMap?.annotations ?? []).map((annotation) => ({
                  id: annotation.id,
                  concept: annotation.concept,
                  render_type: annotation.render_type,
                  label: annotation.label,
                  direction: annotation.direction,
                  timeframe: annotation.timeframe,
                  price_low: annotation.price_low,
                  price_high: annotation.price_high,
                  price: annotation.price,
                  start_time: annotation.start_time,
                  end_time: annotation.end_time,
                  status: annotation.status,
                  confidence: annotation.confidence,
                })),
                analysis_summary: currentICTMap?.analysis_summary,
              }
            : undefined,
      });

      setIsCreateDialogOpen(false);
      resetForm();
      await loadData();
    } catch (error) {
      console.error('Error creating trade:', error);
      alert(error instanceof Error ? error.message : 'Failed to create trade');
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
      const exitPrice = parseFloat(
        (form.elements.namedItem('exit_price') as HTMLInputElement).value
      );
      const notes = (form.elements.namedItem('post_trade_notes') as HTMLTextAreaElement)?.value;

      await closeTrade(isClosingTrade.id, {
        exit_price: exitPrice,
        post_trade_notes: notes,
      });

      setIsClosingTrade(null);
      await loadData();
    } catch (error) {
      console.error('Error closing trade:', error);
      alert(error instanceof Error ? error.message : 'Failed to close trade');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteTrade = async (tradeId: string) => {
    if (!confirm('Are you sure you want to delete this trade?')) return;

    try {
      await deleteTrade(tradeId);
      await loadData();
    } catch (error) {
      console.error('Error deleting trade:', error);
    }
  };

  const handleCreateSampleTrades = async () => {
    try {
      await createSampleTrades();
      await loadData();
    } catch (error) {
      console.error('Error creating sample trades:', error);
    }
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    setIsImporting(true);
    setImportResult(null);
    setImportError(null);
    try {
      const result = await importTrades(file);
      setImportResult(result);
      await loadData();
    } catch (error) {
      setImportError(error instanceof Error ? error.message : 'Failed to import trades');
    } finally {
      setIsImporting(false);
    }
  };

  const handleExport = async () => {
    if (!tierLimits?.can_export) return;

    setIsExporting(true);
    try {
      const blob = await exportTrades();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'glorypicks-trades.csv';
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to export trades');
    } finally {
      setIsExporting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      symbol: '',
      direction: 'long',
      entry_price: '',
      position_size: '',
      stop_loss: '',
      take_profit: '',
      ict_pattern: undefined,
      timeframe: '1h',
      signal_strength: 70,
      emotional_state: undefined,
      pre_trade_notes: '',
      tags: [],
      checklist: [
        { key: 'htf_bias', label: 'Higher-timeframe bias is clear', passed: false },
        { key: 'liquidity', label: 'Liquidity target is identified', passed: false },
        { key: 'risk_defined', label: 'Risk and invalidation are defined', passed: false },
      ],
      linked_signal_id: '',
      screenshots: [],
    });
  };

  const filteredTrades = trades;

  const updateFilter = (key: keyof JournalTradeFilters, value: string) => {
    setFilters((current) => ({ ...current, [key]: value || undefined }));
  };

  const addFilterTag = () => {
    const tag = filterTag.trim();
    if (!tag) return;
    setFilters((current) => ({ ...current, tags: [...(current.tags ?? []), tag] }));
    setFilterTag('');
  };

  const clearFilters = () => {
    setFilters({});
    setFilterTag('');
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(value);
  };

  if (isLoading && !tierLimits) {
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
            <p className="text-text-secondary mt-1">Track your ICT trades and improve your edge</p>
          </div>

          <div className="flex items-center gap-3">
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

            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv"
              onChange={handleImport}
              className="sr-only"
              aria-label="Import trades from CSV"
            />
            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={isImporting}
              aria-label="Import trades from CSV"
            >
              {isImporting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Upload className="h-4 w-4 mr-2" />
              )}
              {isImporting ? 'Importing...' : 'Import CSV'}
            </Button>
            <Button
              variant="outline"
              onClick={handleExport}
              disabled={!tierLimits?.can_export || isExporting}
              title={
                tierLimits?.can_export
                  ? 'Download your trades as a CSV'
                  : 'CSV export is available with Premium'
              }
              aria-label={
                tierLimits?.can_export
                  ? 'Export trades as CSV'
                  : 'Export trades as CSV, Premium feature'
              }
            >
              {isExporting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : tierLimits?.can_export ? (
                <Download className="h-4 w-4 mr-2" />
              ) : (
                <Lock className="h-4 w-4 mr-2" />
              )}
              {isExporting
                ? 'Exporting...'
                : tierLimits?.can_export
                  ? 'Export CSV'
                  : 'Export CSV (Premium)'}
            </Button>
            <Button
              onClick={() => setIsCreateDialogOpen(true)}
              disabled={tierLimits?.trades_remaining === 0}
            >
              <Plus className="h-4 w-4 mr-2" />
              New Trade
            </Button>
          </div>
        </div>

        {(importResult || importError) && (
          <Card className="mb-6 border-border-default">
            <CardContent className="p-4" role="status" aria-live="polite">
              {importError ? (
                <div className="text-sm text-accent-bearish">
                  <p className="font-semibold">CSV import failed</p>
                  <p className="mt-1">{importError}</p>
                </div>
              ) : importResult ? (
                <div className="space-y-3">
                  <div>
                    <p className="font-semibold text-text-primary">CSV import complete</p>
                    <p className="text-sm text-text-secondary mt-1">
                      {importResult.imported_count} accepted, {importResult.rejected_count}{' '}
                      rejected.
                    </p>
                  </div>
                  {importResult.rejected_count > 0 && (
                    <ul
                      className="space-y-1 text-sm text-accent-bearish"
                      aria-label="Rejected CSV rows"
                    >
                      {importResult.rows
                        .filter((row) => !row.accepted)
                        .map((row) => (
                          <li key={row.row_number}>
                            Row {row.row_number}: {row.error || 'Row was rejected'}
                          </li>
                        ))}
                    </ul>
                  )}
                </div>
              ) : null}
            </CardContent>
          </Card>
        )}

        {/* Main Content */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-4">
              <Filter className="h-4 w-4 text-accent-primary" />
              <h2 className="font-semibold text-text-primary">Review filters</h2>
              {Object.values(filters).some((value) => value !== undefined) && (
                <Button variant="ghost" size="sm" className="ml-auto" onClick={clearFilters}>
                  Clear filters
                </Button>
              )}
            </div>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <Input
                aria-label="Filter by symbol"
                placeholder="Symbol"
                value={filters.symbol ?? ''}
                onChange={(e) => updateFilter('symbol', e.target.value.toUpperCase())}
              />
              <Select
                value={filters.direction ?? 'all'}
                onValueChange={(value) => updateFilter('direction', value === 'all' ? '' : value)}
              >
                <SelectTrigger aria-label="Filter by direction">
                  <SelectValue placeholder="Direction" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All directions</SelectItem>
                  <SelectItem value="long">Long</SelectItem>
                  <SelectItem value="short">Short</SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={filters.timeframe ?? 'all'}
                onValueChange={(value) => updateFilter('timeframe', value === 'all' ? '' : value)}
              >
                <SelectTrigger aria-label="Filter by timeframe">
                  <SelectValue placeholder="Timeframe" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All timeframes</SelectItem>
                  <SelectItem value="15m">15m</SelectItem>
                  <SelectItem value="1h">1h</SelectItem>
                  <SelectItem value="4h">4h</SelectItem>
                  <SelectItem value="1d">1d</SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={filters.emotional_state ?? 'all'}
                onValueChange={(value) =>
                  updateFilter('emotional_state', value === 'all' ? '' : value)
                }
              >
                <SelectTrigger aria-label="Filter by emotional state">
                  <SelectValue placeholder="Emotion" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All emotions</SelectItem>
                  {patternOptions?.emotions.map((emotion) => (
                    <SelectItem key={emotion.value} value={emotion.value}>
                      {emotion.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex gap-2">
                <Input
                  aria-label="Add tag filter"
                  placeholder="Tag"
                  value={filterTag}
                  onChange={(e) => setFilterTag(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addFilterTag()}
                />
                <Button type="button" variant="outline" size="sm" onClick={addFilterTag}>
                  Add
                </Button>
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3">
              <Input
                aria-label="Minimum P&L"
                type="number"
                placeholder="Min P&L"
                value={filters.min_pnl ?? ''}
                onChange={(e) =>
                  setFilters({
                    ...filters,
                    min_pnl: e.target.value ? Number(e.target.value) : undefined,
                  })
                }
              />
              <Input
                aria-label="Maximum P&L"
                type="number"
                placeholder="Max P&L"
                value={filters.max_pnl ?? ''}
                onChange={(e) =>
                  setFilters({
                    ...filters,
                    max_pnl: e.target.value ? Number(e.target.value) : undefined,
                  })
                }
              />
              <Input
                aria-label="Entered after"
                type="date"
                value={filters.start_date?.slice(0, 10) ?? ''}
                onChange={(e) => updateFilter('start_date', e.target.value)}
              />
              <Input
                aria-label="Entered before"
                type="date"
                value={filters.end_date?.slice(0, 10) ?? ''}
                onChange={(e) => updateFilter('end_date', e.target.value)}
              />
            </div>
            {(filters.tags?.length ?? 0) > 0 && (
              <div className="flex gap-2 mt-3 flex-wrap">
                {filters.tags?.map((tag) => (
                  <Badge key={tag} variant="outline">
                    {tag}
                  </Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {tierLimits?.is_premium && (
          <Card className="mb-6">
            <CardContent className="p-4">
              <h2 className="font-semibold text-text-primary mb-4">Review summary</h2>
              {reviewError ? (
                <p className="text-sm text-accent-bearish">{reviewError}</p>
              ) : reviewMetrics ? (
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
                  {[
                    ['Matched', reviewMetrics.matched_trades],
                    ['Closed', reviewMetrics.closed_trades],
                    ['Win rate', `${reviewMetrics.win_rate.toFixed(1)}%`],
                    ['Total P&L', formatCurrency(reviewMetrics.total_pnl)],
                    ['Avg R', `${reviewMetrics.avg_r_multiple.toFixed(2)}R`],
                    ['Checklist', `${reviewMetrics.checklist_adherence_rate.toFixed(1)}%`],
                    ['Linked signals', reviewMetrics.signal_linked_trades],
                  ].map(([label, value]) => (
                    <div key={label}>
                      <p className="text-xs text-text-tertiary">{label}</p>
                      <p className="font-mono font-semibold text-text-primary mt-1">{value}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-text-secondary">No review metrics available.</p>
              )}
            </CardContent>
          </Card>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="all">All Trades ({trades.length})</TabsTrigger>
            <TabsTrigger value="open">
              Open ({trades.filter((t) => t.status === 'open').length})
            </TabsTrigger>
            <TabsTrigger value="closed">
              Closed ({trades.filter((t) => t.status === 'closed').length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab}>
            {filteredTrades.length === 0 ? (
              <Card className="py-12">
                <CardContent className="flex flex-col items-center justify-center text-center">
                  <BookOpen className="h-12 w-12 text-text-tertiary mb-4" />
                  <h3 className="text-h3 font-semibold text-text-primary mb-2">No trades yet</h3>
                  <p className="text-text-secondary mb-6 max-w-md">
                    Start tracking your ICT trades to analyze your performance and improve your
                    edge.
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
                      'hover:bg-bg-tertiary/50 transition-colors',
                      trade.status === 'open' && 'border-l-4 border-l-accent-bullish'
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
                            <Badge variant={trade.direction === 'long' ? 'bullish' : 'bearish'}>
                              {trade.direction === 'long' ? (
                                <TrendingUp className="h-3 w-3 mr-1" />
                              ) : (
                                <TrendingDown className="h-3 w-3 mr-1" />
                              )}
                              {trade.direction.toUpperCase()}
                            </Badge>
                            <Badge variant={trade.status === 'open' ? 'default' : 'secondary'}>
                              {trade.status}
                            </Badge>
                            {trade.checklist?.length ? (
                              <Badge variant="outline">Checklist</Badge>
                            ) : null}
                            {trade.linked_signal_id ? (
                              <Badge variant="outline">Signal linked</Badge>
                            ) : null}
                            {trade.chart_snapshot ? (
                              <Badge variant="outline">Snapshot</Badge>
                            ) : null}
                            {trade.screenshots?.length ? (
                              <Badge variant="outline">Screenshot</Badge>
                            ) : null}
                          </div>

                          <div className="flex items-center gap-4 text-sm text-text-secondary">
                            <span>Entry: {formatCurrency(trade.entry_price)}</span>
                            {trade.exit_price && (
                              <span>Exit: {formatCurrency(trade.exit_price)}</span>
                            )}
                            <span>Size: {trade.position_size} shares</span>
                            {trade.ict_pattern && (
                              <Badge variant="outline" className="text-xs">
                                {trade.ict_pattern.replace(/_/g, ' ')}
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
                                  'text-data-lg font-mono font-bold',
                                  trade.pnl_dollar >= 0
                                    ? 'text-accent-bullish'
                                    : 'text-accent-bearish'
                                )}
                              >
                                {trade.pnl_dollar >= 0 ? '+' : ''}
                                {formatCurrency(trade.pnl_dollar)}
                              </div>
                              <div
                                className={cn(
                                  'text-sm font-mono',
                                  trade.pnl_percent && trade.pnl_percent >= 0
                                    ? 'text-accent-bullish'
                                    : 'text-accent-bearish'
                                )}
                              >
                                {trade.pnl_percent && trade.pnl_percent >= 0 ? '+' : ''}
                                {trade.pnl_percent?.toFixed(2)}%
                              </div>
                              {trade.r_multiple != null && (
                                <div className="text-xs text-text-tertiary">
                                  {trade.r_multiple >= 0 ? '+' : ''}
                                  {trade.r_multiple.toFixed(2)}R
                                </div>
                              )}
                            </div>
                          )}

                          {/* Actions */}
                          <div className="flex items-center gap-2">
                            {trade.status === 'open' && (
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
            <h2 className="text-h2 font-semibold text-text-primary mb-6">Performance Analytics</h2>
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
                  onValueChange={(value: 'long' | 'short') =>
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
                  onChange={(e) => setFormData({ ...formData, entry_price: e.target.value })}
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
                  onChange={(e) => setFormData({ ...formData, position_size: e.target.value })}
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
                  onChange={(e) => setFormData({ ...formData, stop_loss: e.target.value })}
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
                  onChange={(e) => setFormData({ ...formData, take_profit: e.target.value })}
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
                  onValueChange={(value) => setFormData({ ...formData, timeframe: value })}
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
              <Label htmlFor="signal_strength">Signal Strength: {formData.signal_strength}%</Label>
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
                onChange={(e) => setFormData({ ...formData, pre_trade_notes: e.target.value })}
                placeholder="Why are you taking this trade? What's your plan?"
                rows={3}
              />
            </div>

            {/* Review Capture */}
            <div className="space-y-4 border-t border-border-subtle pt-4">
              <h3 className="font-semibold text-text-primary">Review capture</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="linked_signal_id">Linked Signal ID</Label>
                  <Input
                    id="linked_signal_id"
                    value={formData.linked_signal_id}
                    onChange={(e) => setFormData({ ...formData, linked_signal_id: e.target.value })}
                    placeholder="Optional signal ID"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="screenshots">Screenshot references</Label>
                  <Input
                    id="screenshots"
                    value={formData.screenshots.join(', ')}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        screenshots: e.target.value
                          .split(',')
                          .map((value) => value.trim())
                          .filter(Boolean),
                      })
                    }
                    placeholder="https://... or asset reference"
                  />
                </div>
              </div>
              <fieldset className="space-y-2">
                <legend className="text-sm font-medium text-text-primary">Entry checklist</legend>
                {[
                  ['htf_bias', 'Higher-timeframe bias is clear'],
                  ['liquidity', 'Liquidity target is identified'],
                  ['risk_defined', 'Risk and invalidation are defined'],
                ].map(([key, label]) => {
                  const item = formData.checklist.find((check) => check.key === key);
                  return (
                    <label
                      key={key}
                      className="flex items-center gap-2 text-sm text-text-secondary"
                    >
                      <input
                        type="checkbox"
                        checked={item?.passed ?? false}
                        onChange={(e) => {
                          const checklist = formData.checklist.filter((check) => check.key !== key);
                          setFormData({
                            ...formData,
                            checklist: [...checklist, { key, label, passed: e.target.checked }],
                          });
                        }}
                      />
                      {label}
                    </label>
                  );
                })}
              </fieldset>
            </div>

            {/* Submit */}
            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Create Trade'
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
                  'Close Trade'
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
