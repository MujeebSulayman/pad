import { Analytics } from "@vercel/analytics/next";
import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { GlassBoot } from "@/components/glass-boot";
import { LiquidGlassDefs } from "@/components/liquid-glass";
import { themeInitScript } from "@/components/theme";
import { ToastProvider } from "@/components/toast";
import { WalletProvider } from "@/components/wallet/wallet-provider";
import "./globals.css";

export const metadata: Metadata = {
  title: "ShadowPad — Launch once, shadow everywhere",
  description:
    "Launch a token on Robinhood, Solana, Base or BNB Chain from one form — or shadow the same token across all four in a single run. Compare fees, curves and graduation thresholds across 10 venues before you sign.",
  applicationName: "ShadowPad",
  manifest: "/manifest.webmanifest",
  icons: { icon: { url: "/icon.svg", type: "image/svg+xml" } },
  appleWebApp: { title: "ShadowPad", statusBarStyle: "black-translucent" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ecede6" },
    { media: "(prefers-color-scheme: dark)", color: "#0b0c0e" },
  ],
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    // data-theme is rewritten by themeInitScript before hydration.
    <html lang="en" data-theme="dark" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
        <link rel="preconnect" href="https://api.fontshare.com" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link rel="stylesheet" href="https://api.fontshare.com/v2/css?f[]=general-sans@400,500,600,700&f[]=clash-display@400,500,600,700&display=swap" />
      </head>
      <body>
        <LiquidGlassDefs />
        <GlassBoot />
        <ToastProvider>
          <WalletProvider>{children}</WalletProvider>
        </ToastProvider>
        <Analytics />
      </body>
    </html>
  );
}
