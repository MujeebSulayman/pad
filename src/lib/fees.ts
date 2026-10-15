/*
 * ShadowPad's own fees. Every fee goes to the treasury wallets below; with a wallet unset, the
 * fees on that side are off (nothing is charged) rather than sent anywhere unexpected.
 * NEXT_PUBLIC_ because the browser builds the transactions that carry them.
 */

const clean = (v: string | undefined) => (v ?? "").trim();

export const TREASURY = {
  solana: clean(process.env.NEXT_PUBLIC_TREASURY_SOLANA),
  evm: clean(process.env.NEXT_PUBLIC_TREASURY_EVM),
};

/** 2% on trades, withdrawals and token supply. */
export const FEE_BPS = 200;
export const FEE_LABEL = `${FEE_BPS / 100}%`;

/** `amount` × 2%, rounded down. */
export const feeOf = (amount: bigint) => (amount * BigInt(FEE_BPS)) / 10_000n;

/** The treasury for a chain, or null when fees are off there. */
export const treasuryFor = (chain: "solana" | "evm") => TREASURY[chain] || null;
