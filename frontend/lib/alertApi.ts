/**
 * Alert API service functions
 * Handles all alert-related API calls to the backend
 */

import type { Alert, AlertTriggered, AlertStats, AlertType, SoundName } from '@/lib/store';
import { getSessionId, getAuthHeaders } from '@/lib/session';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000';

// =============================================================================
// Types
// =============================================================================

export interface CreateAlertData {
  symbol: string;
  alert_type: AlertType;
  strength_threshold?: number;
  price_threshold?: number;
  enabled?: boolean;
  send_notification?: boolean;
  play_sound?: boolean;
  sound_name?: SoundName;
  expires_at?: string;
  notes?: string;
}

export interface UpdateAlertData {
  enabled?: boolean;
  send_notification?: boolean;
  play_sound?: boolean;
  sound_name?: SoundName;
  notes?: string;
}

// =============================================================================
// API Functions
// =============================================================================

/**
 * Create a new alert
 */
export async function createAlert(data: CreateAlertData): Promise<Alert> {
  const response = await fetch(`${API_BASE}/alerts`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to create alert');
  }

  return response.json();
}

/**
 * Get all alerts for the current user
 */
export async function getAlerts(symbol?: string): Promise<Alert[]> {
  const url = symbol 
    ? `${API_BASE}/alerts?symbol=${encodeURIComponent(symbol)}`
    : `${API_BASE}/alerts`;

  const response = await fetch(url, {
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    throw new Error('Failed to fetch alerts');
  }

  return response.json();
}

/**
 * Get a specific alert by ID
 */
export async function getAlert(alertId: string): Promise<Alert> {
  const response = await fetch(`${API_BASE}/alerts/${alertId}`, {
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    throw new Error('Failed to fetch alert');
  }

  return response.json();
}

/**
 * Update an existing alert
 */
export async function updateAlert(alertId: string, data: UpdateAlertData): Promise<Alert> {
  const response = await fetch(`${API_BASE}/alerts/${alertId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to update alert');
  }

  return response.json();
}

/**
 * Delete an alert
 */
export async function deleteAlert(alertId: string): Promise<void> {
  const response = await fetch(`${API_BASE}/alerts/${alertId}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    throw new Error('Failed to delete alert');
  }
}

/**
 * Reset a triggered alert back to active status
 */
export async function resetAlert(alertId: string): Promise<Alert> {
  const response = await fetch(`${API_BASE}/alerts/${alertId}/reset`, {
    method: 'POST',
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    throw new Error('Failed to reset alert');
  }

  return response.json();
}

/**
 * Get alert trigger history
 */
export async function getAlertHistory(limit: number = 100): Promise<AlertTriggered[]> {
  const response = await fetch(`${API_BASE}/alerts/history?limit=${limit}`, {
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    throw new Error('Failed to fetch alert history');
  }

  return response.json();
}

/**
 * Get alert statistics
 */
export async function getAlertStats(): Promise<AlertStats> {
  const response = await fetch(`${API_BASE}/alerts/stats`, {
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    throw new Error('Failed to fetch alert stats');
  }

  return response.json();
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Get alert type display name
 */
export function getAlertTypeName(alertType: AlertType): string {
  const names: Record<AlertType, string> = {
    signal_flip: 'Signal Flip',
    strength_above: 'Strength Above',
    strength_below: 'Strength Below',
    price_above: 'Price Above',
    price_below: 'Price Below',
    breaker_appeared: 'Breaker Block Appeared',
    fvg_appeared: 'Fair Value Gap Appeared',
    bos_formed: 'Break of Structure',
    mss_formed: 'Market Structure Shift',
  };
  return names[alertType] || alertType;
}

/**
 * Get alert type description
 */
export function getAlertTypeDescription(alertType: AlertType): string {
  const descriptions: Record<AlertType, string> = {
    signal_flip: 'Triggered when buy/sell signal changes direction',
    strength_above: 'Triggered when signal strength rises above threshold',
    strength_below: 'Triggered when signal strength falls below threshold',
    price_above: 'Triggered when price crosses above threshold',
    price_below: 'Triggered when price crosses below threshold',
    breaker_appeared: 'Triggered when a new Breaker Block is detected',
    fvg_appeared: 'Triggered when a new Fair Value Gap is detected',
    bos_formed: 'Triggered when Break of Structure forms',
    mss_formed: 'Triggered when Market Structure Shift forms',
  };
  return descriptions[alertType] || '';
}

/**
 * Get alert icon based on type
 */
export function getAlertTypeIcon(alertType: AlertType): string {
  const icons: Record<AlertType, string> = {
    signal_flip: '🔄',
    strength_above: '📈',
    strength_below: '📉',
    price_above: '⬆️',
    price_below: '⬇️',
    breaker_appeared: '🧱',
    fvg_appeared: '🎯',
    bos_formed: '🏗️',
    mss_formed: '🚀',
  };
  return icons[alertType] || '🔔';
}

/**
 * Check if alert type requires threshold parameter
 */
export function alertTypeRequiresThreshold(alertType: AlertType): 'strength' | 'price' | null {
  const strengthAlerts: AlertType[] = ['strength_above', 'strength_below'];
  const priceAlerts: AlertType[] = ['price_above', 'price_below'];

  if (strengthAlerts.includes(alertType)) return 'strength';
  if (priceAlerts.includes(alertType)) return 'price';
  return null;
}
