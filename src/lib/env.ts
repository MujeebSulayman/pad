import type { ChainId } from "./data";

/*
 * Public runtime config. Every value is NEXT_PUBLIC_ (inlined at build time), so nothing here
 * may be a secret. Each `process.env.X` must be written out literally for Next to inline it.
 */

const clean = (v: string | undefined) => (v ?? "").trim();

/** Privy app used for login and wallets. Empty → the app falls back to a simulated wallet. */
export const PRIVY_APP_ID = clean(process.env.NEXT_PUBLIC_PRIVY_APP_ID);

export const SOLANA_CAIP2 = "solana:mainnet";

const solanaRpc = clean(process.env.NEXT_PUBLIC_SOLANA_RPC_URL) || "https://api.mainnet-beta.solana.com";

/** JSON-RPC endpoint per chain. Robinhood Chain has no default: set it once you have an endpoint. */
export const RPC_URL: Record<ChainId, string> = {
  solana: solanaRpc,
  base: clean(process.env.NEXT_PUBLIC_BASE_RPC_URL) || "https://mainnet.base.org",
  bsc: clean(process.env.NEXT_PUBLIC_BSC_RPC_URL) || "https://bsc-dataseed.bnb.org",
  robinhood: clean(process.env.NEXT_PUBLIC_ROBINHOOD_RPC_URL),
};

export const SOLANA_WS_URL = clean(process.env.NEXT_PUBLIC_SOLANA_WS_URL) || solanaRpc.replace(/^http/, "ws");

/** EVM chain ids. Robinhood Chain's comes from env, since it has no default. */
export const EVM_CHAIN_ID: Partial<Record<ChainId, number>> = {
  base: 8453,
  bsc: 56,
  ...(Number(process.env.NEXT_PUBLIC_ROBINHOOD_CHAIN_ID) > 0 ? { robinhood: Number(process.env.NEXT_PUBLIC_ROBINHOOD_CHAIN_ID) } : {}),
};

/** Robinhood Chain is only wired for real wallets when both its RPC and chain id are set. */
export const ROBINHOOD_ENABLED = !!RPC_URL.robinhood && !!EVM_CHAIN_ID.robinhood;
