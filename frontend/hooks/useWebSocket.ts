"use client";

import { useEffect, useRef, useCallback } from "react";
import { useStore } from "@/lib/store";
import type { WebSocketMessage, Candle, Signal } from "@/types";

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8000";

export function useWebSocket(symbol: string) {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const heartbeatIntervalRef = useRef<NodeJS.Timeout>();
  const lastPingTimeRef = useRef<number>(Date.now());

  const {
    setWsConnected,
    setWsLatency,
    setCandles,
    addCandle,
    setSignal,
    setCurrentPrice,
    setHealth,
    setLastUpdate,
    addToast,
  } = useStore();

  const calculateLatency = useCallback(() => {
    const now = Date.now();
    const latency = now - lastPingTimeRef.current;
    lastPingTimeRef.current = now;
    return latency;
  }, []);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    try {
      const ws = new WebSocket(`${WS_URL}/ws?symbol=${symbol}`);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log("WebSocket connected");
        setWsConnected(true);
        setWsLatency(null);

        // Start heartbeat interval
        if (heartbeatIntervalRef.current) {
          clearInterval(heartbeatIntervalRef.current);
        }
        heartbeatIntervalRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            lastPingTimeRef.current = Date.now();
            ws.send(JSON.stringify({ type: "ping" }));
          }
        }, 30000); // Send ping every 30 seconds
      };

      ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);

          switch (message.type) {
            case "connected":
              console.log("WebSocket connection confirmed:", message.message);
              break;

            case "pong":
              // Calculate latency based on ping time
              const latency = calculateLatency();
              setWsLatency(latency);
              break;

            case "heartbeat":
              // Update last update time
              setLastUpdate(Date.now());
              break;

            case "price":
              // Handle price update
              if (message.price !== undefined) {
                setCurrentPrice(message.price);
                setLastUpdate(Date.now());
              }
              break;

            case "candle":
              // Handle candle update
              if (message.candle && message.interval) {
                const candle: Candle = message.candle;
                addCandle(message.interval, candle);
                setLastUpdate(Date.now());
              }
              break;

            case "signal":
              // Handle signal update
              if (message.payload) {
                const signal = message.payload as Signal;
                setSignal(signal);
                setLastUpdate(Date.now());
              }
              break;

            case "alert_triggered":
              // Handle alert triggered event
              if (message.payload) {
                console.log("Alert triggered via WebSocket:", message.payload);
                
                // Dispatch custom event for the page component to handle
                window.dispatchEvent(new CustomEvent('alert_triggered', {
                  detail: message
                }));
              }
              break;

            case "error":
              console.error("WebSocket error:", message.message);
              addToast(message.message || "WebSocket error", "error");
              break;

            default:
              console.warn("Unknown WebSocket message type:", message.type);
          }
        } catch (error) {
          console.error("Error parsing WebSocket message:", error);
        }
      };

      ws.onerror = (error) => {
        console.error("WebSocket error:", {
          type: error.type,
          timestamp: new Date().toISOString(),
          url: ws.url,
          readyState: ws.readyState,
        });
        setWsConnected(false);
        addToast(`WebSocket connection failed to ${WS_URL}`, "error");
      };

      ws.onclose = (event) => {
        console.log("WebSocket disconnected:", {
          code: event.code,
          reason: event.reason || "No reason provided",
          wasClean: event.wasClean,
          timestamp: new Date().toISOString(),
        });
        setWsConnected(false);
        
        // Clear heartbeat interval
        if (heartbeatIntervalRef.current) {
          clearInterval(heartbeatIntervalRef.current);
          heartbeatIntervalRef.current = undefined;
        }

        // Attempt to reconnect after 5 seconds (only if not intentionally closed)
        if (event.code !== 1000 && event.code !== 1001) {
          if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
          }
          reconnectTimeoutRef.current = setTimeout(() => {
            console.log("Attempting to reconnect...");
            connect();
          }, 5000);
        }
      };
    } catch (error) {
      console.error("Error creating WebSocket connection:", error);
      setWsConnected(false);
    }
  }, [symbol, setWsConnected, setWsLatency, addCandle, setCurrentPrice, setSignal, setLastUpdate, addToast, calculateLatency]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = undefined;
    }

    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = undefined;
    }

    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    setWsConnected(false);
  }, [setWsConnected]);

  // Connect when symbol changes
  useEffect(() => {
    disconnect();
    connect();

    return () => {
      disconnect();
    };
  }, [symbol, connect, disconnect]);

  return {
    connected: useStore((state) => state.wsConnected),
    latency: useStore((state) => state.wsLatency),
  };
}
