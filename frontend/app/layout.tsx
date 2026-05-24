import type { Metadata } from 'next';
import { DM_Sans, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import { AppProviders } from '@/components/AppProviders';

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-dm-sans',
  display: 'swap',
  weight: ['400', '500', '600', '700'],
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains',
  display: 'swap',
  weight: ['400', '500', '600'],
});

const themeInitScript = `
(() => {
  try {
    const stored = window.localStorage.getItem("glorypicks_preferences");
    const selectedTheme = stored ? JSON.parse(stored)?.preferences?.display?.theme : "dark";
    const systemTheme = window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
    const resolvedTheme = selectedTheme === "system" ? systemTheme : selectedTheme || "dark";
    document.documentElement.classList.remove("light", "dark");
    document.documentElement.classList.add(resolvedTheme);
    document.documentElement.style.colorScheme = resolvedTheme;
  } catch {
    document.documentElement.classList.add("dark");
    document.documentElement.style.colorScheme = "dark";
  }
})();
`;

export const metadata: Metadata = {
  title: 'GloryPicks | Professional Trading Signals',
  description:
    'Real-time multi-asset trading signals with ICT strategy analysis. Professional-grade institutional trading analysis for stocks, crypto, forex, and indices.',
  keywords: ['trading', 'signals', 'ICT', 'technical analysis', 'stocks', 'crypto', 'forex'],
  authors: [{ name: 'GloryPicks' }],
  openGraph: {
    title: 'GloryPicks | Professional Trading Signals',
    description: 'Real-time multi-asset trading signals with ICT strategy analysis',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body
        className={`${dmSans.variable} ${jetbrainsMono.variable} font-sans antialiased bg-bg-primary text-text-primary min-h-screen`}
      >
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
