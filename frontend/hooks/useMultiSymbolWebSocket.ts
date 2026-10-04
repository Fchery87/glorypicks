'use client';

import { useEffect, useRef, useState } from 'react';
import { getSessionId } from '@/lib/session';
import type { Signal, WebSocketMessage } from '@/types';

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000';
export interface SymbolRealtimeUpdate {
  symbol: string;
  price?: number;
  signal?: Signal;
  message: WebSocketMessage;
}

export interface MultiSymbolWebSocketOptions {
  onUpdate?: (update: SymbolRealtimeUpdate) => void;
  onOffline?: (offline: boolean) => void;
}

export function buildMultiSymbolWebSocketUrl(symbols: string[], baseUrl = WS_URL): string {
  const url = new URL(`${baseUrl.replace(/\/$/, '')}/ws`);
  url.searchParams.set('symbols', symbols.join(','));
  url.searchParams.set('session_id', getSessionId());
  return url.toString().replace(/^http/, 'ws');
}

export function useMultiSymbolWebSocket(
  symbols: string[],
  options: MultiSymbolWebSocketOptions = {}
) {
  const [connected, setConnected] = useState(false);
  const socketRef = useRef<WebSocket | null>(null);
  const retryRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const attemptRef = useRef(0);
  const symbolsKey = [
    ...new Set(symbols.map((symbol) => symbol.trim().toUpperCase()).filter(Boolean)),
  ]
    .sort()
    .join(',');

  useEffect(() => {
    if (!symbolsKey) {
      setConnected(false);
      options.onOffline?.(false);
      return;
    }
    let disposed = false;
    const connect = () => {
      if (disposed) return;
      const socket = new WebSocket(buildMultiSymbolWebSocketUrl(symbolsKey.split(',')));
      socketRef.current = socket;
      socket.onopen = () => {
        attemptRef.current = 0;
        setConnected(true);
        options.onOffline?.(false);
      };
      socket.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data) as WebSocketMessage;
          if (message.symbol) {
            options.onUpdate?.({
              symbol: message.symbol,
              price: message.type === 'price' ? message.price : undefined,
              signal: message.type === 'signal' ? (message.payload as Signal) : undefined,
              message,
            });
          }
        } catch {
          // Ignore malformed realtime messages.
        }
      };
      socket.onerror = () => {
        setConnected(false);
        options.onOffline?.(true);
      };
      socket.onclose = () => {
        setConnected(false);
        if (!disposed) {
          options.onOffline?.(true);
          const delay = Math.min(30000, 1000 * 2 ** attemptRef.current++);
          retryRef.current = setTimeout(connect, delay);
        }
      };
    };
    connect();
    return () => {
      disposed = true;
      if (retryRef.current) clearTimeout(retryRef.current);
      socketRef.current?.close(1000);
      socketRef.current = null;
    };
  }, [symbolsKey, options.onOffline, options.onUpdate]);

  return { connected, offline: !connected && Boolean(symbolsKey) };
}
