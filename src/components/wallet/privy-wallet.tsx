"use client";

import { useMemo, type ReactNode } from "react";
import { PrivyProvider, usePrivy, useWallets as useEvmWallets } from "@privy-io/react-auth";
import { toSolanaWalletConnectors, useSignTransaction, useWallets as useSolanaWallets } from "@privy-io/react-auth/solana";
import { createSolanaRpc, createSolanaRpcSubscriptions } from "@solana/kit";
import { createWalletClient, custom, type Address } from "viem";
import { EVM_CHAIN_ID, RPC_URL, SOLANA_CAIP2, SOLANA_WS_URL } from "@/lib/env";
import { EVM_CHAINS, VIEM_CHAIN } from "@/lib/evm-chains";
import { useTheme } from "../theme";
import { WalletContext, type Signer, type Wallet } from "./context";

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
  const { ready, authenticated, login, logout, getAccessToken } = usePrivy();
  const { wallets: evm } = useEvmWallets();
  const { wallets: sol } = useSolanaWallets();
  const { signTransaction } = useSignTransaction();

  const value = useMemo<Wallet>(() => {
    const connected = ready && authenticated;
    const solWallet = sol[0];
    const evmWallet = evm[0];
    const signer: Signer | null = connected
      ? {
          getAccessToken,
          solana: solWallet
            ? {
                address: solWallet.address,
                signTransaction: async (transaction) =>
                  (await signTransaction({ transaction, wallet: solWallet, chain: SOLANA_CAIP2 })).signedTransaction,
              }
            : null,
          evm: evmWallet
            ? {
                address: evmWallet.address as Address,
                walletClient: async (chain) => {
                  await evmWallet.switchChain(EVM_CHAIN_ID[chain]);
                  const provider = await evmWallet.getEthereumProvider();
                  return createWalletClient({ account: evmWallet.address as Address, chain: VIEM_CHAIN[chain], transport: custom(provider) });
                },
                signMessage: async (message) => {
                  const provider = await evmWallet.getEthereumProvider();
                  return provider.request({ method: "personal_sign", params: [message, evmWallet.address] });
                },
              }
            : null,
        }
      : null;
    return {
      mode: "privy",
      ready,
      connected,
      addressFor: (chain) => (chain === "solana" ? (solWallet?.address ?? null) : (evmWallet?.address ?? null)),
      connect: () => login(),
      disconnect: () => void logout(),
      signer,
    };
  }, [ready, authenticated, login, logout, getAccessToken, evm, sol, signTransaction]);

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
          accentColor: light ? "#c2410c" : "#FF5B1F",
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
