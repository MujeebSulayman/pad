"use client";

import { lazy, Suspense, useEffect, useMemo, useState, type ReactNode } from "react";
import { PRIVY_APP_ID } from "@/lib/env";
import { mintAddress } from "@/lib/format";
import { WalletContext, type Wallet } from "./context";

// Privy is heavy, so it only loads in the browser, after the first render.
const PrivyWallet = lazy(() => import("./privy-wallet"));

/** No Privy app configured: a fake wallet with deterministic addresses, so the demo still runs. */
function SimulatedWallet({ children }: { children: ReactNode }) {
  const [connected, setConnected] = useState(false);
  const value = useMemo<Wallet>(
    () => ({
      mode: "simulated",
      ready: true,
      connected,
      addressFor: (chain) => (connected ? mintAddress(chain, "wallet-session") : null),
      connect: () => setConnected(true),
      disconnect: () => setConnected(false),
      signer: null,
    }),
    [connected],
  );
  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}

export function WalletProvider({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!PRIVY_APP_ID) return <SimulatedWallet>{children}</SimulatedWallet>;

  // Until Privy loads, render with a not-ready wallet so nothing flashes "connected".
  const loading = <WalletContext.Provider value={LOADING}>{children}</WalletContext.Provider>;
  return mounted ? (
    <Suspense fallback={loading}>
      <PrivyWallet appId={PRIVY_APP_ID}>{children}</PrivyWallet>
    </Suspense>
  ) : (
    loading
  );
}

const LOADING: Wallet = { mode: "privy", ready: false, connected: false, addressFor: () => null, connect: () => {}, disconnect: () => {}, signer: null };
