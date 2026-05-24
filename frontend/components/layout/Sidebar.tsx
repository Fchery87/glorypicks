'use client';

import { useState } from 'react';
import { useStore } from '@/lib/store';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { WatchlistItem } from '@/components/WatchlistItem';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Star, Bell, Plus, Trash2, ChevronDown, BookOpen, LayoutDashboard, X } from 'lucide-react';
import type { Watchlist } from '@/types';

interface SidebarProps {
  className?: string;
}

// Watchlist Section Component
const WatchlistSection = ({ watchlist }: { watchlist: Watchlist }) => {
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <div className="border border-border-subtle rounded-sm">
      {/* Watchlist Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-3 bg-bg-tertiary hover:bg-bg-elevated transition-colors"
      >
        <span className="font-medium text-text-primary text-sm">{watchlist.name}</span>
        <ChevronDown
          className={cn(
            'h-4 w-4 text-text-tertiary transition-transform',
            isExpanded && 'rotate-180'
          )}
        />
      </button>

      {/* Watchlist Content */}
      {isExpanded && (
        <div className="p-2">
          <WatchlistItem watchlistId={watchlist.id} />
        </div>
      )}
    </div>
  );
};

export function Sidebar({ className }: SidebarProps) {
  const pathname = usePathname();
  const [activeTab, setActiveTab] = useState<'watchlist' | 'alerts'>('watchlist');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newWatchlistName, setNewWatchlistName] = useState('');
  const [createError, setCreateError] = useState<string | null>(null);

  const { watchlists, addWatchlist, alerts, removeAlert, symbol, addToast } = useStore();

  const handleCreateWatchlist = () => {
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

    // Check for duplicate names
    if (watchlists.some((w) => w.name.toLowerCase() === name.toLowerCase())) {
      setCreateError('A watchlist with this name already exists');
      return;
    }

    // Create new watchlist
    const now = new Date().toISOString();
    const newWatchlist: Watchlist = {
      id: `wl-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      user_id: 'local-user',
      name: name,
      symbols: [],
      created_at: now,
      updated_at: now,
    };

    addWatchlist(newWatchlist);
    addToast(`Created watchlist "${name}"`, 'success');

    // Reset and close
    setNewWatchlistName('');
    setIsCreateDialogOpen(false);
  };

  const handleCloseDialog = () => {
    setIsCreateDialogOpen(false);
    setNewWatchlistName('');
    setCreateError(null);
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleCreateWatchlist();
    } else if (e.key === 'Escape') {
      handleCloseDialog();
    }
  };

  return (
    <aside
      className={cn(
        'flex h-full flex-col border-r border-border-subtle bg-bg-secondary/90 backdrop-blur-xl',
        className
      )}
    >
      <div className="border-b border-border-subtle p-4">
        <p className="section-eyebrow mb-2">Active instrument</p>
        <div className="rounded-2xl border border-border-subtle bg-bg-primary/50 p-3">
          <div className="flex items-center justify-between">
            <span className="font-mono text-lg font-semibold tracking-[0.08em] text-text-primary">
              {symbol}
            </span>
            <span className="live-dot" />
          </div>
          <p className="mt-1 text-xs text-text-tertiary">
            Synced across charts, alerts and risk desk
          </p>
        </div>
      </div>

      {/* Navigation Links */}
      <div className="p-4 border-b border-border-subtle space-y-1">
        <Link href="/">
          <div
            className={cn(
              'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
              pathname === '/'
                ? 'bg-accent-primary/10 text-accent-primary border border-accent-primary/20'
                : 'text-text-secondary hover:bg-bg-tertiary hover:text-text-primary'
            )}
          >
            <LayoutDashboard className="h-4 w-4" />
            Dashboard
          </div>
        </Link>
        <Link href="/journal">
          <div
            className={cn(
              'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
              pathname === '/journal'
                ? 'bg-accent-primary/10 text-accent-primary border border-accent-primary/20'
                : 'text-text-secondary hover:bg-bg-tertiary hover:text-text-primary'
            )}
          >
            <BookOpen className="h-4 w-4" />
            Trade Journal
          </div>
        </Link>
      </div>

      {/* Tab Navigation */}
      <div className="p-4 border-b border-border-subtle bg-bg-primary/20">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
          <TabsList className="w-full grid grid-cols-2">
            <TabsTrigger value="watchlist" className="flex items-center gap-2">
              <Star className="h-4 w-4" />
              <span className="hidden sm:inline">Watchlist</span>
            </TabsTrigger>
            <TabsTrigger value="alerts" className="flex items-center gap-2">
              <Bell className="h-4 w-4" />
              <span className="hidden sm:inline">Alerts</span>
              {alerts.length > 0 && (
                <span className="ml-1 px-1.5 py-0.5 bg-accent-primary/20 text-accent-primary text-[10px] rounded-sm">
                  {alerts.length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === 'watchlist' ? (
          <div className="space-y-4">
            {watchlists.length === 0 ? (
              <div className="text-center py-8">
                <Star className="h-8 w-8 text-text-tertiary mx-auto mb-3" />
                <p className="text-text-secondary text-sm">No watchlists yet</p>
                <p className="text-text-tertiary text-xs mt-1">Create a watchlist to get started</p>
              </div>
            ) : (
              watchlists.map((watchlist) => (
                <WatchlistSection key={watchlist.id} watchlist={watchlist} />
              ))
            )}

            {/* Create Watchlist Button */}
            <Button
              variant="outline"
              size="sm"
              className="w-full mt-4"
              onClick={() => setIsCreateDialogOpen(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Watchlist
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            {alerts.length === 0 ? (
              <div className="text-center py-8">
                <Bell className="h-8 w-8 text-text-tertiary mx-auto mb-3" />
                <p className="text-text-secondary text-sm">No active alerts</p>
                <p className="text-text-tertiary text-xs mt-1">
                  Create alerts from the signal panel
                </p>
              </div>
            ) : (
              alerts.map((alert) => (
                <div
                  key={alert.id}
                  className="rounded-xl border border-border-subtle bg-bg-tertiary p-3"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-text-primary font-medium text-sm">{alert.symbol}</span>
                    <Button variant="ghost" size="icon-sm" onClick={() => removeAlert(alert.id)}>
                      <Trash2 className="h-4 w-4 text-text-tertiary hover:text-error" />
                    </Button>
                  </div>
                  <p className="text-text-secondary text-xs capitalize">
                    {alert.alert_type.replace(/_/g, ' ')}:{' '}
                    {alert.price_threshold ?? alert.strength_threshold ?? 'armed'}
                  </p>
                  <p className="text-text-tertiary text-[10px] mt-1">
                    Created {new Date(alert.created_at).toLocaleDateString()}
                  </p>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Create Watchlist Dialog */}
      {isCreateDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={handleCloseDialog}
          />

          {/* Dialog Content */}
          <div className="relative bg-bg-secondary border border-border-subtle rounded-sm shadow-lg w-full max-w-md mx-4 p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-text-primary">Create Watchlist</h3>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={handleCloseDialog}
                className="text-text-tertiary hover:text-text-primary"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Form */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">
                  Watchlist Name
                </label>
                <Input
                  type="text"
                  placeholder="Enter watchlist name..."
                  value={newWatchlistName}
                  onChange={(e) => {
                    setNewWatchlistName(e.target.value);
                    if (createError) setCreateError(null);
                  }}
                  onKeyDown={handleKeyPress}
                  autoFocus
                  className="w-full"
                />
                {createError && <p className="text-xs text-accent-bearish mt-2">{createError}</p>}
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-2">
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
