import { CHAIN, type ChainId } from "../data";
import { nativeBalance } from "../rpc";
import type { LegCtx } from "./types";

/** Estimated network gas per deploy, in the chain's native asset. Generous on purpose. */
export const gasFor = (chain: ChainId) => (chain === "solana" ? 0.0015 : chain === "bsc" ? 0.0009 : 0.00012);

/**
 * What a Solana launch needs before any dev buy: account rent, fees and priority fee, with headroom.
 * (Bags answers an unfunded payer with a bare HTTP 500, so it needs this check most.)
 */
const SOLANA_MIN: Record<string, number> = { pumpfun: 0.03, bags: 0.05 };

const short = (a: string) => `${a.slice(0, 4)}…${a.slice(-4)}`;

/**
 * Fails the leg early, with the real reason, when the wallet can't cover the launch. `need` defaults
 * to the venue's minimum plus the dev buy; pass it once an exact cost is known (e.g. Four.meme's fee).
 * If the balance can't be read (no RPC, RPC down) the check is skipped rather than blocking the launch.
 */
export async function requireFunds(ctx: LegCtx, address: string, need?: number) {
  const chain = CHAIN[ctx.pad.chain];
  const devBuy = ctx.pad.fields.includes("devBuy") ? Number(ctx.draft.devBuy) || 0 : 0;
  const required = need ?? (SOLANA_MIN[ctx.pad.id] ?? gasFor(chain.id)) + devBuy;
  const have = await nativeBalance(chain.id, address).catch(() => null);
  if (have === null || have >= required) return;
  const sym = chain.nativeToken;
  throw new Error(
    `Your ${chain.name} wallet (${short(address)}) has ${have.toFixed(4)} ${sym}. A ${ctx.pad.name} launch needs about ${required.toFixed(4)} ${sym}` +
      `${devBuy > 0 ? " including your dev buy" : ""} and gas. Add ${sym} to that wallet and try again.`,
  );
}
