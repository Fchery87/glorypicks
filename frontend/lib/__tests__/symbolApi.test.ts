import { describe, expect, it } from 'vitest';
import { buildRecentSymbolUrl, buildSymbolSearchUrl, mapSymbolSearchResponse } from '../symbolApi';

describe('symbol API helpers', () => {
  it('builds encoded search URLs with optional asset class', () => {
    expect(buildSymbolSearchUrl('  apple inc ', 'stock', 'http://api.test/')).toBe(
      'http://api.test/symbols/search?q=apple+inc&asset_class=stock'
    );
    expect(buildSymbolSearchUrl('', 'all', 'http://api.test')).toBe(
      'http://api.test/symbols/search'
    );
  });

  it('encodes recent symbol paths', () => {
    expect(buildRecentSymbolUrl(' btc-usd ', 'http://api.test')).toBe(
      'http://api.test/symbols/recent/BTC-USD'
    );
  });

  it('maps backend metadata and ignores malformed entries', () => {
    expect(
      mapSymbolSearchResponse({
        results: [
          { symbol: 'AAPL', name: 'Apple', asset_class: 'stock', exchange: 'NASDAQ' },
          { name: 'Missing symbol' },
        ],
        recent: [{ symbol: 'BTC-USD', assetClass: 'crypto', currency: 'USD' }],
      })
    ).toEqual({
      results: [{ symbol: 'AAPL', name: 'Apple', asset_class: 'stock', exchange: 'NASDAQ' }],
      recent: [
        { symbol: 'BTC-USD', name: 'BTC-USD', asset_class: 'crypto', currency: 'USD' },
      ],
      trending: [],
    });
  });
});
