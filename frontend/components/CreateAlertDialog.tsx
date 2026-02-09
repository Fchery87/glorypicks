'use client';

/**
 * CreateAlertDialog Component
 * Dialog for creating new trading alerts
 */

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { useStore } from '@/lib/store';
import { createAlert } from '@/lib/alertApi';
import { getAlertTypeName, getAlertTypeDescription, alertTypeRequiresThreshold } from '@/lib/alertApi';
import type { AlertType, SoundName } from '@/lib/store';

interface CreateAlertDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultSymbol?: string;
}

export function CreateAlertDialog({ open, onOpenChange, defaultSymbol = '' }: CreateAlertDialogProps) {
  const { addAlert, addToast } = useStore();

  // Form state
  const [symbol, setSymbol] = useState(defaultSymbol);
  const [alertType, setAlertType] = useState<AlertType>('strength_above');
  const [strengthThreshold, setStrengthThreshold] = useState<number>(75);
  const [priceThreshold, setPriceThreshold] = useState<number>(100);
  const [enabled, setEnabled] = useState(true);
  const [sendNotification, setSendNotification] = useState(true);
  const [playSound, setPlaySound] = useState(true);
  const [soundName, setSoundName] = useState<SoundName>('chime');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Update symbol when defaultSymbol changes
  useEffect(() => {
    if (defaultSymbol) {
      setSymbol(defaultSymbol);
    }
  }, [defaultSymbol]);

  const thresholdType = alertTypeRequiresThreshold(alertType);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!symbol.trim()) {
      addToast('Please enter a symbol', 'error');
      return;
    }

    if (thresholdType === 'strength' && !strengthThreshold) {
      addToast('Please enter a strength threshold', 'error');
      return;
    }

    if (thresholdType === 'price' && !priceThreshold) {
      addToast('Please enter a price threshold', 'error');
      return;
    }

    setIsSubmitting(true);

    try {
      const data = {
        symbol: symbol.trim().toUpperCase(),
        alert_type: alertType,
        strength_threshold: thresholdType === 'strength' ? strengthThreshold : undefined,
        price_threshold: thresholdType === 'price' ? priceThreshold : undefined,
        enabled,
        send_notification: sendNotification,
        play_sound: playSound,
        sound_name: soundName,
        notes: notes.trim() || undefined,
      };

      const newAlert = await createAlert(data);
      addAlert(newAlert);
      addToast('Alert created successfully!', 'success');

      // Reset form and close
      resetForm();
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to create alert:', error);
      addToast(error instanceof Error ? error.message : 'Failed to create alert', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setSymbol(defaultSymbol);
    setAlertType('strength_above');
    setStrengthThreshold(75);
    setPriceThreshold(100);
    setEnabled(true);
    setSendNotification(true);
    setPlaySound(true);
    setSoundName('chime');
    setNotes('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Alert</DialogTitle>
          <DialogDescription>
            Set up a custom alert for trading signals and patterns
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            {/* Symbol Input */}
            <div className="space-y-2">
              <Label htmlFor="symbol">Symbol *</Label>
              <Input
                id="symbol"
                placeholder="AAPL, BTC/USDT, etc."
                value={symbol}
                onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                required
              />
            </div>

            {/* Alert Type Select */}
            <div className="space-y-2">
              <Label htmlFor="alertType">Alert Type *</Label>
              <Select value={alertType} onValueChange={(value) => setAlertType(value as AlertType)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select alert type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="signal_flip">🔄 Signal Flip</SelectItem>
                  <SelectItem value="strength_above">📈 Strength Above</SelectItem>
                  <SelectItem value="strength_below">📉 Strength Below</SelectItem>
                  <SelectItem value="price_above">⬆️ Price Above</SelectItem>
                  <SelectItem value="price_below">⬇️ Price Below</SelectItem>
                  <SelectItem value="breaker_appeared">🧱 Breaker Block Appeared</SelectItem>
                  <SelectItem value="fvg_appeared">🎯 Fair Value Gap Appeared</SelectItem>
                  <SelectItem value="bos_formed">🏗️ Break of Structure</SelectItem>
                  <SelectItem value="mss_formed">🚀 Market Structure Shift</SelectItem>
                </SelectContent>
              </Select>
              {alertType && (
                <p className="text-xs text-muted-foreground">
                  {getAlertTypeDescription(alertType)}
                </p>
              )}
            </div>

            {/* Strength Threshold */}
            {thresholdType === 'strength' && (
              <div className="space-y-2">
                <Label htmlFor="strengthThreshold">
                  Strength Threshold (%): {strengthThreshold}%
                </Label>
                <Input
                  id="strengthThreshold"
                  type="range"
                  min="0"
                  max="100"
                  value={strengthThreshold}
                  onChange={(e) => setStrengthThreshold(Number(e.target.value))}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>0%</span>
                  <span>100%</span>
                </div>
              </div>
            )}

            {/* Price Threshold */}
            {thresholdType === 'price' && (
              <div className="space-y-2">
                <Label htmlFor="priceThreshold">Price Threshold ($)</Label>
                <Input
                  id="priceThreshold"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="100.00"
                  value={priceThreshold}
                  onChange={(e) => setPriceThreshold(Number(e.target.value))}
                  required
                />
              </div>
            )}

            {/* Notification Settings */}
            <div className="space-y-3 pt-2 border-t">
              <div className="flex items-center justify-between">
                <Label htmlFor="enabled" className="cursor-pointer">Enable Alert</Label>
                <Switch id="enabled" checked={enabled} onCheckedChange={setEnabled} />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="sendNotification" className="cursor-pointer">Browser Notification</Label>
                <Switch id="sendNotification" checked={sendNotification} onCheckedChange={setSendNotification} />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="playSound" className="cursor-pointer">Play Sound</Label>
                <Switch id="playSound" checked={playSound} onCheckedChange={setPlaySound} />
              </div>

              {playSound && (
                <div className="space-y-2">
                  <Label htmlFor="soundName">Sound</Label>
                  <Select value={soundName} onValueChange={(value) => setSoundName(value as SoundName)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="default">🔔 Default</SelectItem>
                      <SelectItem value="chime">🎵 Chime</SelectItem>
                      <SelectItem value="bell">🔔 Bell</SelectItem>
                      <SelectItem value="alert">🚨 Alert</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Textarea
                id="notes"
                placeholder="Add any notes about this alert..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Creating...' : 'Create Alert'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
