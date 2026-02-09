"use client";

import { useEffect, useState } from "react";
import { Header } from "@/components/layout/Header";
import { Sidebar } from "@/components/layout/Sidebar";
import { StatusBar } from "@/components/layout/StatusBar";
import { ChartPanel } from "@/components/ChartPanel";
import { SignalCard } from "@/components/SignalCard";
import { RationaleList } from "@/components/RationaleList";
import { TickerSearch } from "@/components/TickerSearch";
import { MultiChartGrid } from "@/components/MultiChartGrid";
import { PositionCalculator } from "@/components/PositionCalculator";
import { KillZoneIndicator } from "@/components/KillZoneIndicator";
import { useWebSocket } from "@/hooks/useWebSocket";
import { useStore } from "@/lib/store";
import type { Interval } from "@/types";
import { cn } from "@/lib/utils";

export default function HomePage() {
  const {
    symbol,
    timeframe,
    signal,
    setCandles,
    setSignal,
    setIsLoadingData,
    setIsLoadingSignal,
    setDataError,
    setSignalError,
    addToast,
    wsConnected,
    chartLayout,
  } = useStore();

  // Check if user is premium (for demo purposes, we'll check localStorage)
  const [isPremium, setIsPremium] = useState(false);

  useEffect(() => {
    const sessionId = localStorage.getItem("glorypicks_session_id");
    if (sessionId && sessionId.startsWith("premium_")) {
      setIsPremium(true);
    }
  }, []);

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Initialize WebSocket connection
  useWebSocket(symbol, true);

  // Fetch historical data when symbol or timeframe changes
  useEffect(() => {
    const fetchHistoricalData = async () => {
      setIsLoadingData(true);
      setDataError(null);

      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
        const intervals: Interval[] = ["15m", "1h", "1d"];

        const promises = intervals.map(async (interval) => {
          const response = await fetch(
            `${apiUrl}/data?symbol=${encodeURIComponent(symbol)}&interval=${interval}&limit=200`
          );

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.detail || `Failed to fetch ${interval} data`);
          }

          const data = await response.json();
          return { interval, candles: data.candles };
        });

        const results = await Promise.all(promises);

        results.forEach(({ interval, candles }) => {
          setCandles(interval, candles);
        });
      } catch (error) {
        console.error("Error fetching historical data:", error);
        const errorMessage = error instanceof Error ? error.message : "Failed to fetch data";
        setDataError(errorMessage);

        if (errorMessage.includes("No data found")) {
          addToast("No market data available. Please configure API keys in backend .env file.", "error");
        } else {
          addToast(errorMessage, "error");
        }
      } finally {
        setIsLoadingData(false);
      }
    };

    fetchHistoricalData();
  }, [symbol, setCandles, setIsLoadingData, setDataError, addToast]);

  // Fetch signal when symbol changes
  useEffect(() => {
    const fetchSignal = async () => {
      setIsLoadingSignal(true);
      setSignalError(null);

      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
        const response = await fetch(
          `${apiUrl}/signal?symbol=${encodeURIComponent(symbol)}`
        );

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          const errorMessage = errorData.detail || "Failed to fetch signal";
          
          if (errorMessage.includes("No data found")) {
            setSignalError("Waiting for market data...");
            return;
          }

          throw new Error(errorMessage);
        }

        const data = await response.json();
        setSignal(data);
      } catch (error) {
        console.error("Error fetching signal:", error);
        const errorMessage = error instanceof Error ? error.message : "Failed to fetch signal";
        setSignalError(errorMessage);
      } finally {
        setIsLoadingSignal(false);
      }
    };

    fetchSignal();
  }, [symbol, setSignal, setIsLoadingSignal, setSignalError]);

  // Listen for alert_triggered events from WebSocket
  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleAlertTriggered = (event: CustomEvent) => {
      const { payload } = event.detail;
      addToast(`${payload.symbol}: ${payload.message}`, "info");
    };

    window.addEventListener("alert_triggered", handleAlertTriggered as EventListener);

    return () => {
      window.removeEventListener("alert_triggered", handleAlertTriggered as EventListener);
    };
  }, [addToast]);

  return (
    <div className="min-h-screen bg-bg-primary flex flex-col">
      {/* Header */}
      <Header 
        onMenuToggle={() => setIsSidebarOpen(!isSidebarOpen)} 
        isMenuOpen={isSidebarOpen}
      >
        <TickerSearch />
      </Header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar - Desktop: always visible, Mobile: toggleable */}
        <Sidebar 
          className={cn(
            "fixed inset-y-0 left-0 z-40 w-72 transform transition-transform duration-200 ease-out lg:static lg:transform-none",
            isSidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
          )} 
        />

        {/* Overlay for mobile */}
        {isSidebarOpen && (
          <div 
            className="fixed inset-0 bg-bg-primary/80 z-30 lg:hidden"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6 pb-16">
          <div className="max-w-7xl mx-auto">
            {/* Multi-Chart View */}
            <MultiChartGrid isPremium={isPremium} />

            {/* Signal Section */}
            <div className="mt-6 grid grid-cols-1 xl:grid-cols-3 gap-6">
              <div className="xl:col-span-2 space-y-6">
                <SignalCard />
                <PositionCalculator 
                  signal={signal ? {
                    entry_price: signal.key_levels?.entry || signal.price || 0,
                    stop_loss: signal.key_levels?.stop_loss || 0,
                    take_profit: signal.key_levels?.take_profit || 0,
                    recommendation: signal.recommendation,
                    strength: signal.strength
                  } : undefined}
                />
              </div>
              <div className="space-y-6">
                <KillZoneIndicator />
                <RationaleList />
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Status Bar */}
      <StatusBar />
    </div>
  );
}
