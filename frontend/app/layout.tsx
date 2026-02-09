import type { Metadata } from "next";
import { DM_Sans, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { TimezoneProvider } from "@/components/TimezoneSettings";

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
  display: "swap",
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "GloryPicks | Professional Trading Signals",
  description: "Real-time multi-asset trading signals with ICT strategy analysis. Professional-grade institutional trading analysis for stocks, crypto, forex, and indices.",
  keywords: ["trading", "signals", "ICT", "technical analysis", "stocks", "crypto", "forex"],
  authors: [{ name: "GloryPicks" }],
  openGraph: {
    title: "GloryPicks | Professional Trading Signals",
    description: "Real-time multi-asset trading signals with ICT strategy analysis",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body
        className={`${dmSans.variable} ${jetbrainsMono.variable} font-sans antialiased bg-bg-primary text-text-primary min-h-screen`}
      >
        <TimezoneProvider>
          {children}
        </TimezoneProvider>
      </body>
    </html>
  );
}
