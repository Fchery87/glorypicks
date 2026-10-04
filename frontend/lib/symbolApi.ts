import type { AssetClass, Symbol } from '@/types';
import { getAuthHeaders } from '@/lib/session';

export interface SymbolResult extends Symbol {
  exchange?: string;
  currency?: string;
  sector?: string;
}

export interface SymbolSearchResponse {
  results: SymbolResult[];
  recent: SymbolResult[];
  trending: SymbolResult[];
}

const apiBaseUrl = (baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000') =>
  baseUrl.replace(/\/$/, '');

export function buildSymbolSearchUrl(
  query: string,
  assetClass: AssetClass | 'all' = 'all',
  baseUrl?: string
): string {
  const url = new URL(`${apiBaseUrl(baseUrl)}/symbols/search`);
  const normalizedQuery = query.trim();
  if (normalizedQuery) url.searchParams.set('q', normalizedQuery);
  if (assetClass !== 'all') url.searchParams.set('asset_class', assetClass);
  return url.toString();
}

export function buildRecentSymbolUrl(symbol: string, baseUrl?: string): string {
  return `${apiBaseUrl(baseUrl)}/symbols/recent/${encodeURIComponent(symbol.trim().toUpperCase())}`;
}

function mapSymbol(value: unknown): SymbolResult | null {
  if (!value || typeof value !== 'object') return null;
  const item = value as Record<string, unknown>;
  const symbol = item.symbol;
  if (typeof symbol !== 'string' || !symbol) return null;
  return {
    symbol,
    name: typeof item.name === 'string' ? item.name : symbol,
    asset_class: (item.asset_class || item.assetClass || 'stock') as AssetClass,
    exchange: typeof item.exchange === 'string' ? item.exchange : undefined,
    currency: typeof item.currency === 'string' ? item.currency : undefined,
    sector: typeof item.sector === 'string' ? item.sector : undefined,
  };
}

const mapList = (value: unknown): SymbolResult[] =>
  Array.isArray(value)
    ? value.map(mapSymbol).filter((item): item is SymbolResult => item !== null)
    : [];

export function mapSymbolSearchResponse(value: unknown): SymbolSearchResponse {
  const body = (value && typeof value === 'object' ? value : {}) as Record<string, unknown>;
  const results = mapList(body.results ?? body.symbols ?? value);
  return {
    results,
    recent: mapList(body.recent),
    trending: mapList(body.trending),
  };
}

export async function searchSymbols(
  query: string,
  assetClass: AssetClass | 'all' = 'all',
  signal?: AbortSignal
): Promise<SymbolSearchResponse> {
  const response = await fetch(buildSymbolSearchUrl(query, assetClass), {
    headers: getAuthHeaders(),
    signal,
  });
  if (!response.ok) throw new Error(`Symbol search failed (${response.status})`);

  const searchResults = mapSymbolSearchResponse(await response.json());
  if (query.trim()) return searchResults;

  const [recentResponse, trendingResponse] = await Promise.all([
    fetch(`${apiBaseUrl()}/symbols/recent`, {
      headers: getAuthHeaders(),
      signal,
    }),
    fetch(`${apiBaseUrl()}/symbols/trending`, {
      headers: getAuthHeaders(),
      signal,
    }),
  ]);
  if (!recentResponse.ok || !trendingResponse.ok) {
    throw new Error('Symbol discovery failed');
  }

  return {
    ...searchResults,
    recent: mapList(await recentResponse.json()),
    trending: mapList(await trendingResponse.json()),
  };
}

export async function recordRecentSymbol(symbol: string): Promise<void> {
  const response = await fetch(buildRecentSymbolUrl(symbol), {
    method: 'POST',
    headers: getAuthHeaders(),
  });
  if (!response.ok) throw new Error(`Unable to record recent symbol (${response.status})`);
}
