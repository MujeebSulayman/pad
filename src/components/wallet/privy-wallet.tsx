"use client";

import { useMemo, type ReactNode } from "react";
import { PrivyProvider, usePrivy, useWallets as useEvmWallets } from "@privy-io/react-auth";
import { toSolanaWalletConnectors, useWallets as useSolanaWallets } from "@privy-io/react-auth/solana";
import { createSolanaRpc, createSolanaRpcSubscriptions } from "@solana/kit";
import { defineChain, type Chain } from "viem";
import { base, bsc } from "viem/chains";
import { EVM_CHAIN_ID, ROBINHOOD_ENABLED, RPC_URL, SOLANA_CAIP2, SOLANA_WS_URL } from "@/lib/env";
import { useTheme } from "../theme";
import { WalletContext, type Wallet } from "./context";

const withRpc = (chain: Chain, url: string): Chain => ({ ...chain, rpcUrls: { ...chain.rpcUrls, default: { http: [url] } } });

const EVM_CHAINS: Chain[] = [
  withRpc(base, RPC_URL.base),
  withRpc(bsc, RPC_URL.bsc),
  ...(ROBINHOOD_ENABLED
    ? [
        defineChain({
          id: EVM_CHAIN_ID.robinhood!,
          name: "Robinhood Chain",
          nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
          rpcUrls: { default: { http: [RPC_URL.robinhood] } },
        }),
      ]
    : []),
];

const solanaConnectors = toSolanaWalletConnectors();
const solanaRpcs = {
  [SOLANA_CAIP2]: {
    rpc: createSolanaRpc(RPC_URL.solana),
    rpcSubscriptions: createSolanaRpcSubscriptions(SOLANA_WS_URL),
    blockExplorerUrl: "https://solscan.io",
  },
};

/** Maps Privy's session and wallets onto the app's wallet context. */
function Bridge({ children }: { children: ReactNode }) {
  const { ready, authenticated, login, logout } = usePrivy();
  const { wallets: evm } = useEvmWallets();
  const { wallets: sol } = useSolanaWallets();

  const value = useMemo<Wallet>(
    () => ({
      mode: "privy",
      ready,
      connected: ready && authenticated,
      addressFor: (chain) => (chain === "solana" ? (sol[0]?.address ?? null) : (evm[0]?.address ?? null)),
      connect: () => login(),
      disconnect: () => void logout(),
    }),
    [ready, authenticated, login, logout, evm, sol],
  );

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}

/** Real wallets via Privy: one login, a Solana and an EVM wallet (embedded if the user has none). */
export default function PrivyWallet({ appId, children }: { appId: string; children: ReactNode }) {
  const light = useTheme() === "light";
  return (
    <PrivyProvider
      appId={appId}
      config={{
        loginMethods: ["email", "wallet"],
        appearance: {
          theme: light ? "light" : "dark",
          accentColor: light ? "#4c6b0a" : "#C5F24A",
          logo: "/icon.svg",
          walletChainType: "ethereum-and-solana",
        },
        embeddedWallets: {
          ethereum: { createOnLogin: "users-without-wallets" },
          solana: { createOnLogin: "users-without-wallets" },
        },
        defaultChain: EVM_CHAINS[0],
        supportedChains: EVM_CHAINS,
        externalWallets: { solana: { connectors: solanaConnectors } },
        solana: { rpcs: solanaRpcs },
      }}
    >
      <Bridge>{children}</Bridge>
    </PrivyProvider>
  );
}
