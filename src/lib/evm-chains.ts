import { defineChain, type Chain } from "viem";
import { base, bsc } from "viem/chains";
import type { ChainId } from "./data";
import { EVM_CHAIN_ID, ROBINHOOD_ENABLED, RPC_URL } from "./env";

const withRpc = (chain: Chain, url: string): Chain => ({ ...chain, rpcUrls: { ...chain.rpcUrls, default: { http: [url] } } });

export const robinhood = defineChain({
  id: EVM_CHAIN_ID.robinhood,
  name: "Robinhood Chain",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: { default: { http: [RPC_URL.robinhood] } },
  blockExplorers: { default: { name: "Robinhood Explorer", url: "https://explorer.robinhood.com" } },
});

/** viem chain per EVM ChainId, pointed at our RPC endpoints. */
export const VIEM_CHAIN: Record<Exclude<ChainId, "solana">, Chain> = {
  base: withRpc(base, RPC_URL.base),
  bsc: withRpc(bsc, RPC_URL.bsc),
  robinhood,
};

/** Chains offered to Privy. Robinhood Chain only once its RPC is configured. */
export const EVM_CHAINS: Chain[] = [VIEM_CHAIN.base, VIEM_CHAIN.bsc, ...(ROBINHOOD_ENABLED ? [robinhood] : [])];
