'use client';

import { useEffect, useState } from 'react';
import { useStore } from '@/lib/store';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { WatchlistItem } from '@/components/WatchlistItem';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Star, Bell, Plus, Trash2, ChevronDown, BookOpen, LayoutDashboard, X, Sparkles, Pencil } from 'lucide-react';
import { getSessionId } from '@/lib/session';
import type { Watchlist } from '@/types';
import { getAlertHistory, getAlertStats } from '@/lib/alertApi';
import type { AlertStats, AlertTriggered } from '@/types';

interface SidebarProps {
  className?: string;
  style?: React.CSSProperties;
}

const WatchlistSection = ({ watchlist }: { watchlist: Watchlist }) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(watchlist.name);
  const [isDeleteConfirm, setIsDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const { updateWatchlist, deleteWatchlist, addToast } = useStore();

  const handleRename = async () => {
    const name = renameValue.trim();
    if (!name || name === watchlist.name) {
      setIsRenaming(false);
      setRenameValue(watchlist.name);
      return;
    }

    try {
      const response = await fetch(
        (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000') +
          '/watchlist/' +
          watchlist.id,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'X-Session-ID': getSessionId(),
          },
          body: JSON.stringify({ name }),
        }
      );

      if (response.ok) {
        const updated = await response.json();
        updateWatchlist(updated);
      } else {
        updateWatchlist({ ...watchlist, name, updated_at: new Date().toISOString() });
      }
    } catch {
      updateWatchlist({ ...watchlist, name, updated_at: new Date().toISOString() });
    }

    setIsRenaming(false);
    addToast(`Renamed to "${name}"`, 'success');
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await fetch(
        (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000') +
          '/watchlist/' +
          watchlist.id,
        {
          method: 'DELETE',
          headers: { 'X-Session-ID': getSessionId() },
        }
      );
    } catch {
      // Backend unavailable, delete locally
    }
    deleteWatchlist(watchlist.id);
    setIsDeleting(false);
    setIsDeleteConfirm(false);
    addToast(`Deleted "${watchlist.name}"`, 'info');
  };

  return (
    <div className="rounded-lg border border-border-subtle overflow-hidden">
      <div className="flex items-center justify-between p-2.5 bg-bg-tertiary/40 hover:bg-bg-tertiary transition-colors">
        {isRenaming ? (
          <input
            type="text"
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleRename();
              if (e.key === 'Escape') {
                setRenameValue(watchlist.name);
                setIsRenaming(false);
              }
            }}
            onBlur={handleRename}
            className="flex-1 bg-bg-primary border border-border-default rounded px-2 py-1 text-sm font-medium text-text-primary font-mono outline-none focus:border-accent-primary"
            autoFocus
          />
        ) : (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-2 flex-1 text-left"
          >
            <span className="font-medium text-text-primary text-sm">{watchlist.name}</span>
            <ChevronDown
              className={cn(
                'h-3.5 w-3.5 text-text-tertiary transition-transform duration-200',
                isExpanded && 'rotate-180'
              )}
            />
          </button>
        )}

        <div className="flex items-center gap-1 ml-2">
          <button
            onClick={() => {
              setRenameValue(watchlist.name);
              setIsRenaming(true);
            }}
            className="h-6 w-6 flex items-center justify-center rounded text-text-tertiary hover:text-text-primary hover:bg-bg-elevated transition-colors"
            title="Rename watchlist"
          >
            <Pencil className="h-3 w-3" />
          </button>
          {isDeleteConfirm ? (
            <div className="flex items-center gap-1">
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="h-6 px-2 flex items-center justify-center rounded text-[10px] font-mono uppercase tracking-wider bg-accent-bearish/20 text-accent-bearish hover:bg-accent-bearish/30 transition-colors"
              >
                {isDeleting ? '...' : 'Confirm'}
              </button>
              <button
                onClick={() => setIsDeleteConfirm(false)}
                className="h-6 w-6 flex items-center justify-center rounded text-text-tertiary hover:text-text-primary transition-colors"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setIsDeleteConfirm(true)}
              className="h-6 w-6 flex items-center justify-center rounded text-text-tertiary hover:text-accent-bearish hover:bg-accent-bearish/10 transition-colors"
              title="Delete watchlist"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>

      {isExpanded && (
        <div className="p-1.5">
          <WatchlistItem watchlistId={watchlist.id} />
        </div>
      )}
    </div>
  );
};

export function Sidebar({ className, style }: SidebarProps) {
  const pathname = usePathname();
  const [activeTab, setActiveTab] = useState<'watchlist' | 'alerts'>('watchlist');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newWatchlistName, setNewWatchlistName] = useState('');
  const [createError, setCreateError] = useState<string | null>(null);
  const [alertStats, setAlertStats] = useState<AlertStats | null>(null);
  const [alertHistory, setAlertHistory] = useState<AlertTriggered[]>([]);

  const { watchlists, addWatchlist, alerts, removeAlert, symbol, addToast } = useStore();

  useEffect(() => {
    if (activeTab !== 'alerts') return;
    Promise.all([getAlertStats(), getAlertHistory(5)])
      .then(([stats, history]) => {
        setAlertStats(stats);
        setAlertHistory(history);
      })
      .catch(() => {
        setAlertStats(null);
        setAlertHistory([]);
      });
  }, [activeTab, alerts.length]);

  const handleCreateWatchlist = async () => {
    setCreateError(null);
    const name = newWatchlistName.trim();

    if (!name) {
      setCreateError('Please enter a watchlist name');
      return;
    }
    if (name.length > 50) {
      setCreateError('Watchlist name must be less than 50 characters');
      return;
    }
    if (watchlists.some((w) => w.name.toLowerCase() === name.toLowerCase())) {
      setCreateError('A watchlist with this name already exists');
      return;
    }

    // Try backend first
    try {
      const response = await fetch(
        (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000') + '/watchlist',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Session-ID': getSessionId(),
          },
          body: JSON.stringify({ name, symbols: [] }),
        }
      );

      if (response.ok) {
        const watchlist = await response.json();
        addWatchlist(watchlist);
        addToast(`Created watchlist "${name}"`, 'success');
        setNewWatchlistName('');
        setIsCreateDialogOpen(false);
        return;
      }
    } catch {
      // Backend unavailable, fall through to local creation
    }

    // Fallback: create locally
    const now = new Date().toISOString();
    const newWatchlist: Watchlist = {
      id: `wl-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      user_id: 'local-user',
      name,
      symbols: [],
      created_at: now,
      updated_at: now,
    };

    addWatchlist(newWatchlist);
    addToast(`Created watchlist "${name}" (local)`, 'success');
    setNewWatchlistName('');
    setIsCreateDialogOpen(false);
  };

  const handleCloseDialog = () => {
    setIsCreateDialogOpen(false);
    setNewWatchlistName('');
    setCreateError(null);
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') handleCreateWatchlist();
    else if (e.key === 'Escape') handleCloseDialog();
  };

  return (
    <aside
      className={cn(
        'flex h-full flex-col border-r border-border-subtle bg-bg-secondary/85 backdrop-blur-xl',
        className
      )}
      style={style}
    >
      <div className="border-b border-border-subtle p-3.5">
        <p className="section-eyebrow mb-2">Active instrument</p>
        <div className="rounded-xl border border-border-subtle bg-bg-primary/60 p-3 relative overflow-hidden group">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-gradient-to-br from-accent-primary/8 to-transparent transition-opacity duration-300 group-hover:from-accent-primary/12"
          />
          {/* Subtle top highlight */}
          <div
            aria-hidden
            className="pointer-events-none absolute top-0 left-0 right-0 h-px"
            style={{
              background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.06), transparent)',
            }}
          />
          <div className="relative flex items-center justify-between">
            <span className="font-mono text-base font-semibold tracking-[0.04em] text-text-primary">
              {symbol}
            </span>
            <span className="live-dot" />
          </div>
          <p className="relative mt-1.5 text-[10px] text-text-tertiary font-mono uppercase tracking-[0.14em]">
            Synced across charts, alerts & risk
          </p>
        </div>
      </div>

      <div className="p-3 border-b border-border-subtle space-y-0.5">
        <Link href="/">
          <div
            className={cn(
              'flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm font-medium transition-all duration-150',
              pathname === '/'
                ? 'bg-accent-primary/12 text-accent-primary border border-accent-primary/25'
                : 'text-text-secondary hover:bg-bg-tertiary hover:text-text-primary border border-transparent'
            )}
          >
            <LayoutDashboard className="h-4 w-4" />
            Dashboard
          </div>
        </Link>
        <Link href="/journal">
          <div
            className={cn(
              'flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm font-medium transition-all duration-150',
              pathname === '/journal'
                ? 'bg-accent-primary/12 text-accent-primary border border-accent-primary/25'
                : 'text-text-secondary hover:bg-bg-tertiary hover:text-text-primary border border-transparent'
            )}
          >
            <BookOpen className="h-4 w-4" />
            Trade Journal
          </div>
        </Link>
      </div>

      <div className="p-3 border-b border-border-subtle">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
          <TabsList className="w-full grid grid-cols-2">
            <TabsTrigger value="watchlist" className="flex items-center gap-2">
              <Star className="h-3.5 w-3.5" />
              <span className="hidden sm:inline text-[11px] font-mono uppercase tracking-[0.12em]">
                Watchlist
              </span>
            </TabsTrigger>
            <TabsTrigger value="alerts" className="flex items-center gap-2">
              <Bell className="h-3.5 w-3.5" />
              <span className="hidden sm:inline text-[11px] font-mono uppercase tracking-[0.12em]">
                Alerts
              </span>
              {alerts.length > 0 && (
                <span className="ml-1 px-1.5 py-0.5 bg-accent-primary/20 text-accent-primary text-[9px] rounded font-mono">
                  {alerts.length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        {activeTab === 'watchlist' ? (
          <div className="space-y-3">
            {watchlists.length === 0 ? (
              <div className="text-center py-8">
                <Star className="h-7 w-7 text-text-tertiary mx-auto mb-3" />
                <p className="text-text-secondary text-sm">No watchlists yet</p>
                <p className="text-text-tertiary text-xs mt-1">Create one to get started</p>
              </div>
            ) : (
              watchlists.map((watchlist) => (
                <WatchlistSection key={watchlist.id} watchlist={watchlist} />
              ))
            )}

            <Button
              variant="outline"
              size="sm"
              className="w-full mt-3 text-[11px] font-mono uppercase tracking-[0.12em]"
              onClick={() => setIsCreateDialogOpen(true)}
            >
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              New watchlist
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-lg border border-border-subtle bg-bg-tertiary/50 p-2.5">
                <p className="text-[10px] font-mono uppercase tracking-[0.12em] text-text-tertiary">
                  Active
                </p>
                <p className="mt-1 font-mono text-lg text-text-primary">
                  {alertStats?.active_alerts ?? alerts.filter((alert) => alert.status === 'active').length}
                </p>
              </div>
              <div className="rounded-lg border border-border-subtle bg-bg-tertiary/50 p-2.5">
                <p className="text-[10px] font-mono uppercase tracking-[0.12em] text-text-tertiary">
                  Triggered today
                </p>
                <p className="mt-1 font-mono text-lg text-text-primary">
                  {alertStats?.triggered_today ?? 0}
                </p>
              </div>
            </div>
            {alerts.length === 0 ? (
              <div className="text-center py-8">
                <Bell className="h-7 w-7 text-text-tertiary mx-auto mb-3" />
                <p className="text-text-secondary text-sm">No active alerts</p>
                <p className="text-text-tertiary text-xs mt-1">
                  Create alerts from the signal panel
                </p>
              </div>
            ) : (
              alerts.map((alert) => (
                <div
                  key={alert.id}
                  className="rounded-lg border border-border-subtle bg-bg-tertiary/50 p-2.5"
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-text-primary font-mono font-semibold text-xs tracking-[0.04em]">
                      {alert.symbol}
                    </span>
                    <Button variant="ghost" size="icon-sm" onClick={() => removeAlert(alert.id)}>
                      <Trash2 className="h-3.5 w-3.5 text-text-tertiary hover:text-error" />
                    </Button>
                  </div>
                  <p className="text-text-secondary text-[11px] capitalize">
                    {alert.alert_type.replace(/_/g, ' ')}:{' '}
                    {alert.price_threshold ?? alert.strength_threshold ?? 'armed'}
                  </p>
                  <p className="text-text-tertiary text-[10px] mt-0.5 font-mono">
                    {new Date(alert.created_at).toLocaleDateString()}
                  </p>
                </div>
              ))
            )}
            <div className="rounded-lg border border-border-subtle bg-bg-tertiary/30 p-2.5">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-[10px] font-mono uppercase tracking-[0.12em] text-text-tertiary">
                  Recent history
                </p>
                <span className="text-[10px] text-text-tertiary">{alertHistory.length}</span>
              </div>
              {alertHistory.length === 0 ? (
                <p className="text-xs text-text-tertiary">No triggered alerts yet.</p>
              ) : (
                <div className="space-y-2">
                  {alertHistory.map((entry) => (
                    <div key={`${entry.alert_id}-${entry.triggered_at}`} className="border-b border-border-subtle pb-2 last:border-0 last:pb-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-xs text-text-primary">{entry.symbol}</span>
                        <span className="text-[10px] text-text-tertiary">
                          {new Date(entry.triggered_at).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                      <p className="mt-0.5 text-[11px] leading-4 text-text-secondary">{entry.message}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {isCreateDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={handleCloseDialog} />
          <div className="relative bg-bg-secondary border border-border-default rounded-xl shadow-2xl w-full max-w-md mx-4 p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-7 w-7 items-center justify-center rounded-md border border-accent-primary/30 bg-accent-primary/10 text-accent-primary">
                  <Sparkles className="h-3.5 w-3.5" />
                </div>
                <h3 className="text-base font-semibold text-text-primary tracking-[-0.01em]">
                  New watchlist
                </h3>
              </div>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={handleCloseDialog}
                className="text-text-tertiary hover:text-text-primary"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-[11px] text-text-tertiary font-mono uppercase tracking-[0.14em] mb-1.5">
                  Name
                </label>
                <Input
                  type="text"
                  placeholder="e.g. Crypto core"
                  value={newWatchlistName}
                  onChange={(e) => {
                    setNewWatchlistName(e.target.value);
                    if (createError) setCreateError(null);
                  }}
                  onKeyDown={handleKeyPress}
                  autoFocus
                  className="w-full"
                />
                {createError && (
                  <p className="text-xs text-accent-bearish mt-1.5">{createError}</p>
                )}
              </div>

              <div className="flex gap-2 pt-1">
                <Button variant="outline" className="flex-1" onClick={handleCloseDialog}>
                  Cancel
                </Button>
                <Button
                  className="flex-1"
                  onClick={handleCreateWatchlist}
                  disabled={!newWatchlistName.trim()}
                >
                  Create
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
