import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../session', () => ({
  getAuthHeaders: () => ({
    'X-Session-ID': 'journal-test-session',
    'Content-Type': 'application/json',
  }),
}));

import { importTrades } from '../journalApi';

describe('journal API CSV import', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('lets the browser set the multipart content type boundary', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          imported_count: 1,
          rejected_count: 0,
          rows: [{ row_number: 2, accepted: true, trade_id: 'trade-1' }],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    );
    const file = new File(
      ['symbol,direction,entry_price,position_size\nAAPL,long,1,1'],
      'trades.csv'
    );

    await importTrades(file);

    const [, options] = fetchMock.mock.calls[0];
    expect(options?.headers).toEqual({ 'X-Session-ID': 'journal-test-session' });
    expect(options?.body).toBeInstanceOf(FormData);
  });
});
