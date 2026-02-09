"use client"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

export function AboutModal() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          About
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>About GloryPicks</DialogTitle>
          <DialogDescription>
            Real-Time Multi-Asset Trading Signals Dashboard
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 text-sm">
          <section>
            <h3 className="font-semibold text-base mb-2">What is GloryPicks?</h3>
            <p className="text-muted-foreground">
              GloryPicks is a real-time trading signals dashboard that provides deterministic,
              rule-based buy/sell signals across multiple asset classes including stocks, crypto,
              forex, and indices. The platform uses multi-timeframe technical analysis with
              transparent, explainable rationale.
            </p>
          </section>

          <section>
            <h3 className="font-semibold text-base mb-2">Signal Methodology</h3>
            <p className="text-muted-foreground mb-2">
              Our signals are generated using a combination of proven technical indicators:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-2">
              <li>SMA (50/200) for trend identification</li>
              <li>RSI (14) for momentum analysis</li>
              <li>MACD (12,26,9) for trend confirmation</li>
              <li>Multi-timeframe confluence (15m, 1h, 1D)</li>
            </ul>
            <p className="text-muted-foreground mt-2">
              Signals are weighted across timeframes (15m: 35%, 1h: 35%, 1D: 30%) and only use
              closed candles to prevent repainting.
            </p>
          </section>

          <section>
            <h3 className="font-semibold text-base mb-2">Technology Stack</h3>
            <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-2">
              <li>Frontend: Next.js, TypeScript, Tailwind CSS, shadcn/ui</li>
              <li>Charts: TradingView Lightweight Charts</li>
              <li>Backend: FastAPI, Python, WebSockets</li>
              <li>State Management: Zustand</li>
            </ul>
          </section>

          <section className="border-t pt-4">
            <h3 className="font-semibold text-base mb-2 text-destructive">
              ⚠️ Important Disclaimer
            </h3>
            <div className="bg-destructive/10 border border-destructive/30 rounded-md p-3 space-y-2">
              <p className="text-muted-foreground font-medium">
                <strong>NOT FINANCIAL ADVICE:</strong> GloryPicks is an educational and
                informational tool only. The signals and information provided are for learning
                purposes and should not be considered financial, investment, trading, or any other
                type of professional advice.
              </p>
              <p className="text-muted-foreground">
                <strong>No Guarantees:</strong> Past performance does not indicate future results.
                Trading and investing involve substantial risk of loss. You should never invest
                money you cannot afford to lose.
              </p>
              <p className="text-muted-foreground">
                <strong>Your Responsibility:</strong> All investment and trading decisions are
                your own responsibility. Always conduct your own research and consult with
                qualified financial professionals before making any trading decisions.
              </p>
              <p className="text-muted-foreground">
                <strong>No Liability:</strong> The creators and operators of GloryPicks accept no
                liability for any losses or damages resulting from the use of this platform or
                reliance on any signals or information provided.
              </p>
            </div>
          </section>

          <section className="text-center text-xs text-muted-foreground pt-2 border-t">
            <p>Version 1.0.0</p>
            <p className="mt-1">
              Built with open-source technologies. For educational purposes only.
            </p>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}
