'use client';

/**
 * AlertManager Component
 * Main UI component for managing trading alerts
 */

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { useStore } from '@/lib/store';
import { getAlerts, deleteAlert, updateAlert } from '@/lib/alertApi';
import { getAlertTypeIcon, getAlertTypeName } from '@/lib/alertApi';
import { Plus, Trash2, RotateCcw, Bell } from 'lucide-react';
import { CreateAlertDialog } from '@/components/CreateAlertDialog';

export function AlertManager({ defaultSymbol = '' }: { defaultSymbol?: string }) {
  const {
    alerts,
    isLoadingAlerts,
    setAlerts,
    setIsLoadingAlerts,
    addAlert,
    updateAlert: updateStoreAlert,
    deleteAlert: deleteStoreAlert,
    addToast,
  } = useStore();

  const [filterSymbol, setFilterSymbol] = useState<string>(defaultSymbol);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  // Load alerts on mount
  useEffect(() => {
    loadAlerts();
  }, [filterSymbol]);

  const loadAlerts = async () => {
    try {
      setIsLoadingAlerts(true);
      const data = await getAlerts(filterSymbol || undefined);
      setAlerts(data);
    } catch (error) {
      console.error('Failed to load alerts:', error);
      addToast('Failed to load alerts', 'error');
    } finally {
      setIsLoadingAlerts(false);
    }
  };

  const handleToggleEnabled = async (alertId: string, enabled: boolean) => {
    try {
      const updated = await updateAlert(alertId, { enabled });
      updateStoreAlert(alertId, updated);
      addToast(`Alert ${enabled ? 'enabled' : 'disabled'}`, 'success');
    } catch (error) {
      console.error('Failed to toggle alert:', error);
      addToast('Failed to update alert', 'error');
    }
  };

  const handleDelete = async (alertId: string) => {
    if (!confirm('Are you sure you want to delete this alert?')) {
      return;
    }

    try {
      await deleteAlert(alertId);
      deleteStoreAlert(alertId);
      addToast('Alert deleted', 'success');
    } catch (error) {
      console.error('Failed to delete alert:', error);
      addToast('Failed to delete alert', 'error');
    }
  };

  const handleReset = async (alertId: string) => {
    try {
      const updated = await updateAlert(alertId, { enabled: true });
      updateStoreAlert(alertId, { ...updated, status: 'active' as const, triggered_at: undefined });
      addToast('Alert reset to active', 'success');
    } catch (error) {
      console.error('Failed to reset alert:', error);
      addToast('Failed to reset alert', 'error');
    }
  };

  const filteredAlerts = filterSymbol
    ? alerts.filter((a) => a.symbol === filterSymbol)
    : alerts;

  return (
    <>
      <Card className="w-full">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>🚨 Alert Manager</CardTitle>
              <CardDescription>
                Manage your trading alerts and notifications
              </CardDescription>
            </div>
            <Button
              onClick={() => setIsCreateDialogOpen(true)}
              size="sm"
            >
              <Plus className="h-4 w-4 mr-2" />
              New Alert
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filter by symbol */}
          <div className="mb-4">
            <input
              type="text"
              placeholder="Filter by symbol..."
              value={filterSymbol}
              onChange={(e) => setFilterSymbol(e.target.value.toUpperCase())}
              className="w-full px-3 py-2 text-sm border rounded-md"
            />
          </div>

          {/* Alerts list */}
          {isLoadingAlerts ? (
            <div className="text-center py-8 text-muted-foreground">
              Loading alerts...
            </div>
          ) : filteredAlerts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {filterSymbol ? (
                <>No alerts found for {filterSymbol}</>
              ) : (
                <>
                  No alerts yet. Click "New Alert" to create your first alert!
                </>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredAlerts.map((alert) => (
                <AlertItem
                  key={alert.id}
                  alert={alert}
                  onToggleEnabled={handleToggleEnabled}
                  onDelete={handleDelete}
                  onReset={handleReset}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Alert Dialog */}
      <CreateAlertDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        defaultSymbol={filterSymbol || defaultSymbol}
      />
    </>
  );
}

// Alert Item Component
interface AlertItemProps {
  alert: {
    id: string;
    symbol: string;
    alert_type: string;
    status: string;
    enabled: boolean;
    send_notification: boolean;
    play_sound: boolean;
    sound_name: string;
    strength_threshold?: number;
    price_threshold?: number;
    created_at: string;
    triggered_at?: string;
    notes?: string;
  };
  onToggleEnabled: (id: string, enabled: boolean) => void;
  onDelete: (id: string) => void;
  onReset: (id: string) => void;
}

function AlertItem({ alert, onToggleEnabled, onDelete, onReset }: AlertItemProps) {
  const icon = getAlertTypeIcon(alert.alert_type as any);
  const alertName = getAlertTypeName(alert.alert_type as any);

  const getThresholdDisplay = () => {
    if (alert.strength_threshold !== undefined) {
      return `Strength: ${alert.strength_threshold}%`;
    }
    if (alert.price_threshold !== undefined) {
      return `Price: $${alert.price_threshold.toFixed(2)}`;
    }
    return '';
  };

  const getStatusBadge = () => {
    switch (alert.status) {
      case 'active':
        return <Badge variant="default">Active</Badge>;
      case 'triggered':
        return <Badge variant="secondary">Triggered</Badge>;
      case 'disabled':
        return <Badge variant="outline">Disabled</Badge>;
      default:
        return <Badge variant="outline">{alert.status}</Badge>;
    }
  };

  return (
    <div className="border rounded-lg p-4 space-y-2 hover:bg-accent/50 transition-colors">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{icon}</span>
          <div>
            <div className="font-medium flex items-center gap-2">
              <span>{alert.symbol}</span>
              {getStatusBadge()}
            </div>
            <div className="text-sm text-muted-foreground">{alertName}</div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Notifications */}
          {alert.send_notification && (
            <span title="Browser notifications enabled">
              <Bell className="h-4 w-4 text-muted-foreground" />
            </span>
          )}
          {alert.play_sound && (
            <span title={`Sound: ${alert.sound_name}`}>
              🎵
            </span>
          )}

          {/* Enable/Disable Toggle */}
          <Switch
            checked={alert.enabled}
            onCheckedChange={(checked) => onToggleEnabled(alert.id, checked)}
          />

          {/* Reset Button (if triggered) */}
          {alert.status === 'triggered' && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onReset(alert.id)}
              title="Reset alert to active"
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
          )}

          {/* Delete Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDelete(alert.id)}
            title="Delete alert"
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      </div>

      {/* Threshold display */}
      {getThresholdDisplay() && (
        <div className="text-sm text-muted-foreground">
          {getThresholdDisplay()}
        </div>
      )}

      {/* Notes */}
      {alert.notes && (
        <div className="text-sm text-muted-foreground italic">
          {alert.notes}
        </div>
      )}

      {/* Triggered time */}
      {alert.triggered_at && (
        <div className="text-xs text-muted-foreground">
          Triggered: {new Date(alert.triggered_at).toLocaleString()}
        </div>
      )}
    </div>
  );
}
