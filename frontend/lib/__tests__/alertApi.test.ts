import { beforeEach, describe, expect, it, vi } from 'vitest';

const { apiFetchMock, getAuthHeadersMock } = vi.hoisted(() => ({
  apiFetchMock: vi.fn(),
  getAuthHeadersMock: vi.fn(() => ({
    'X-Session-Token': 'test-token',
    'Content-Type': 'application/json',
  })),
}));

vi.mock('../session', () => ({
  apiFetch: apiFetchMock,
  getAuthHeaders: getAuthHeadersMock,
}));

import {
  createAlert,
  deleteAlert,
  getAlert,
  getAlertHistory,
  getAlerts,
  getAlertStats,
  resetAlert,
  updateAlert,
} from '../alertApi';

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

describe('alert API', () => {
  beforeEach(() => {
    apiFetchMock.mockReset();
    getAuthHeadersMock.mockClear();
  });

  it('creates an alert with auth headers and a JSON body', async () => {
    const alert = { id: 'alert-1', symbol: 'AAPL' };
    apiFetchMock.mockResolvedValue(jsonResponse(alert, 201));

    await expect(createAlert({ symbol: 'AAPL', alert_type: 'signal_flip' })).resolves.toEqual(
      alert
    );

    expect(getAuthHeadersMock).toHaveBeenCalledOnce();
    expect(apiFetchMock).toHaveBeenCalledWith(
      expect.stringMatching(/\/alerts$/),
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ 'X-Session-Token': 'test-token' }),
        body: JSON.stringify({ symbol: 'AAPL', alert_type: 'signal_flip' }),
      })
    );
  });

  it('updates an alert with PUT and auth headers', async () => {
    apiFetchMock.mockResolvedValue(jsonResponse({ id: 'alert-1', enabled: false }));

    await updateAlert('alert-1', { enabled: false });

    expect(apiFetchMock).toHaveBeenCalledWith(
      expect.stringMatching(/\/alerts\/alert-1$/),
      expect.objectContaining({
        method: 'PUT',
        headers: expect.objectContaining({ 'X-Session-Token': 'test-token' }),
        body: JSON.stringify({ enabled: false }),
      })
    );
  });

  it('uses the correct endpoints for read and lifecycle operations', async () => {
    apiFetchMock.mockImplementation(async () => jsonResponse([]));

    await getAlerts('BTC/USDT');
    await getAlert('alert-1');
    await deleteAlert('alert-1');
    await resetAlert('alert-1');
    await getAlertHistory(25);
    await getAlertStats();

    expect(apiFetchMock.mock.calls.map(([url]) => url)).toEqual([
      expect.stringContaining('/alerts?symbol=BTC%2FUSDT'),
      expect.stringContaining('/alerts/alert-1'),
      expect.stringContaining('/alerts/alert-1'),
      expect.stringContaining('/alerts/alert-1/reset'),
      expect.stringContaining('/alerts/history?limit=25'),
      expect.stringContaining('/alerts/stats'),
    ]);
    expect(apiFetchMock.mock.calls[2]?.[1]).toMatchObject({ method: 'DELETE' });
    expect(apiFetchMock.mock.calls[3]?.[1]).toMatchObject({ method: 'POST' });
  });

  it('uses the collection endpoint when no symbol filter is supplied', async () => {
    apiFetchMock.mockResolvedValue(jsonResponse([]));

    await getAlerts();

    expect(apiFetchMock).toHaveBeenCalledWith(expect.stringMatching(/\/alerts$/));
  });

  it('resolves delete without parsing a response body', async () => {
    apiFetchMock.mockResolvedValue(new Response(null, { status: 204 }));

    await expect(deleteAlert('alert-1')).resolves.toBeUndefined();
  });

  it('throws backend error details for failed create and update requests', async () => {
    apiFetchMock.mockResolvedValueOnce(jsonResponse({ detail: 'Invalid alert' }, 400));
    await expect(createAlert({ symbol: 'AAPL', alert_type: 'signal_flip' })).rejects.toThrow(
      'Invalid alert'
    );

    apiFetchMock.mockResolvedValueOnce(jsonResponse({ detail: 'Alert not found' }, 404));
    await expect(updateAlert('missing', { enabled: false })).rejects.toThrow('Alert not found');
  });

  it('throws stable fallback messages for failed non-mutating operations', async () => {
    apiFetchMock.mockResolvedValue(jsonResponse({}, 500));

    await expect(getAlerts()).rejects.toThrow('Failed to fetch alerts');
    await expect(getAlert('alert-1')).rejects.toThrow('Failed to fetch alert');
    await expect(deleteAlert('alert-1')).rejects.toThrow('Failed to delete alert');
    await expect(resetAlert('alert-1')).rejects.toThrow('Failed to reset alert');
    await expect(getAlertHistory()).rejects.toThrow('Failed to fetch alert history');
    await expect(getAlertStats()).rejects.toThrow('Failed to fetch alert stats');
  });
});
