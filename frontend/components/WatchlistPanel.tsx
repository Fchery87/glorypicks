"use client"

import { useState } from 'react';
import { useStore } from '@/lib/store';
import { getSessionId } from '@/lib/session';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Trash2, Loader2 } from 'lucide-react';
import { WatchlistItem } from './WatchlistItem';

/**
 * WatchlistPanel - Main watchlist management component
 * 
 * Features:
 * - List all user watchlists
 * - Create new watchlists
 * - Delete watchlists
 * - Expand/collapse watchlists to view symbols
 * - Real-time signal strength for each symbol
 */
export function WatchlistPanel() {
  const {
    watchlists,
    selectedWatchlistId,
    isLoadingWatchlists,
    addWatchlist,
    deleteWatchlist,
    setSelectedWatchlist,
    addToast
  } = useStore();
  
  const [isCreating, setIsCreating] = useState(false);
  const [newWatchlistName, setNewWatchlistName] = useState('');
  const [isCreatingLoading, setIsCreatingLoading] = useState(false);
  
  const handleCreate = async () => {
    if (!newWatchlistName.trim()) {
      addToast('Please enter a watchlist name', 'error');
      return;
    }
    
    setIsCreatingLoading(true);
    
    try {
      const response = await fetch('http://localhost:8000/watchlist', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Session-ID': getSessionId()
        },
        body: JSON.stringify({
          name: newWatchlistName,
          symbols: []
        })
      });
      
      if (response.ok) {
        const watchlist = await response.json();
        addWatchlist(watchlist);
        setNewWatchlistName('');
        setIsCreating(false);
        addToast('Watchlist created successfully!', 'success');
      } else {
        const error = await response.json();
        addToast(error.detail || 'Failed to create watchlist', 'error');
      }
    } catch (error) {
      console.error('Error creating watchlist:', error);
      addToast('Network error. Please try again.', 'error');
    } finally {
      setIsCreatingLoading(false);
    }
  };
  
  const handleDelete = async (watchlistId: string, watchlistName: string) => {
    if (!confirm(`Delete watchlist "${watchlistName}"?`)) {
      return;
    }
    
    try {
      const response = await fetch(`http://localhost:8000/watchlist/${watchlistId}`, {
        method: 'DELETE',
        headers: {
          'X-Session-ID': getSessionId()
        }
      });
      
      if (response.ok) {
        deleteWatchlist(watchlistId);
        addToast('Watchlist deleted', 'success');
      } else {
        addToast('Failed to delete watchlist', 'error');
      }
    } catch (error) {
      console.error('Error deleting watchlist:', error);
      addToast('Network error. Please try again.', 'error');
    }
  };
  
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleCreate();
    } else if (e.key === 'Escape') {
      setIsCreating(false);
      setNewWatchlistName('');
    }
  };
  
  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-lg">
          <span>Watchlists</span>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setIsCreating(!isCreating)}
            title="Create new watchlist"
          >
            <Plus className="w-4 h-4" />
          </Button>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="flex-1 overflow-y-auto">
        {/* Create Watchlist Form */}
        {isCreating && (
          <div className="mb-4 p-3 bg-muted rounded-lg space-y-2">
            <Input
              placeholder="Watchlist name..."
              value={newWatchlistName}
              onChange={(e) => setNewWatchlistName(e.target.value)}
              onKeyPress={handleKeyPress}
              disabled={isCreatingLoading}
              autoFocus
            />
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={handleCreate}
                disabled={isCreatingLoading || !newWatchlistName.trim()}
                className="flex-1"
              >
                {isCreatingLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Create'
                )}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setIsCreating(false);
                  setNewWatchlistName('');
                }}
                disabled={isCreatingLoading}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
        
        {/* Watchlist Items */}
        {isLoadingWatchlists ? (
          <div className="flex items-center justify-center py-8 text-muted-foreground">
            <Loader2 className="w-6 h-6 animate-spin mr-2" />
            Loading watchlists...
          </div>
        ) : watchlists.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground space-y-2">
            <p className="text-sm">No watchlists yet.</p>
            <p className="text-xs">
              Click the <Plus className="w-3 h-3 inline mx-1" /> button to create one.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {watchlists.map((watchlist) => (
              <div key={watchlist.id}>
                <div className="flex items-center justify-between p-2 rounded-lg hover:bg-muted transition-colors">
                  <button
                    onClick={() => setSelectedWatchlist(
                      selectedWatchlistId === watchlist.id ? null : watchlist.id
                    )}
                    className="flex-1 text-left"
                    title="Click to expand/collapse"
                  >
                    <div className="font-medium text-sm">{watchlist.name}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {watchlist.symbols.length} {watchlist.symbols.length === 1 ? 'symbol' : 'symbols'}
                    </div>
                  </button>
                  
                  <div className="flex items-center gap-1 ml-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDelete(watchlist.id, watchlist.name)}
                      title="Delete watchlist"
                      className="h-7 w-7 p-0"
                    >
                      <Trash2 className="w-3 h-3 text-destructive" />
                    </Button>
                  </div>
                </div>
                
                {/* Expanded Watchlist Content */}
                {selectedWatchlistId === watchlist.id && (
                  <div className="ml-2 mt-1 pl-3 border-l-2 border-muted">
                    <WatchlistItem watchlistId={watchlist.id} />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
