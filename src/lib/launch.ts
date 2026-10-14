import {
  BASE_FIELDS,
  CHAIN,
  DRAFT_KEY,
  FIELD_META,
  NUMERIC_FIELDS,
  PAD,
  PRICES,
  type Chain,
  type ChainId,
  type Draft,
  type DraftKey,
  type ExtraField,
  type Launchpad,
  type Mirrors,
  type NativeToken,
} from "./data";
import { stepsFor } from "./adapters";
import { mintAddress, txHash } from "./format";

/** Estimated network gas per deploy, in the chain's native asset. */
export const gasFor = (chain: ChainId) => (chain === "solana" ? 0.0015 : chain === "bsc" ? 0.0009 : 0.00012);

/** The dev buy only counts on venues that take one. */
export const devBuyOf = (pad: Launchpad, draft: Draft) => (pad.fields.includes("devBuy") && Number(draft.devBuy)) || 0;

export type CostLeg = { pad: Launchpad; chain: Chain; mirror: boolean; native: number; usd: number };

/** One leg for the primary venue, then one per mirror. */
export function costLegs(pad: Launchpad, draft: Draft, mirrors: Mirrors, prices: Record<NativeToken, number> = PRICES): CostLeg[] {
  return [{ pad, mirror: false }, ...Object.values(mirrors).map((id) => ({ pad: PAD[id!], mirror: true }))].map(({ pad, mirror }) => {
    const chain = CHAIN[pad.chain];
    const native = pad.createFee + devBuyOf(pad, draft) + gasFor(pad.chain);
    return { pad, chain, mirror, native, usd: native * (prices[chain.nativeToken] ?? 0) };
  });
}

export const totalUsd = (legs: CostLeg[]) => legs.reduce((s, l) => s + l.usd, 0);

/** Venues that queue submissions for review instead of trading at once. */
export const isReviewed = (pad: Launchpad) => pad.integration === "review";

export type Validation = {
  errors: Partial<Record<DraftKey, string>>;
  /** Required fields still empty. */
  missing: string[];
  /** Everything blocking the launch: missing fields, then field errors. */
  issues: string[];
};

export function validate(draft: Draft, pad: Launchpad, mirrors: Mirrors = {}): Validation {
  const errors: Partial<Record<DraftKey, string>> = {};
  const missing: string[] = [];

  const name = draft.name.trim();
  if (!name) missing.push("Token name");
  else if (name.length < 2) errors.name = "At least 2 characters.";

  if (!draft.symbol.trim()) missing.push("Symbol");
  else if (draft.symbol.length < 2) errors.symbol = "At least 2 characters.";

  if (!draft.description.trim()) missing.push("Description");

  for (const field of pad.fields) {
    if (BASE_FIELDS.includes(field)) continue;
    const key = DRAFT_KEY[field];
    const value = String(draft[key] ?? "").trim();
    if (NUMERIC_FIELDS.includes(key)) {
      if (value && Number.isNaN(Number(value))) errors[key] = "Must be a number.";
      else if (value && Number(value) < 0) errors[key] = "Cannot be negative.";
      if (key === "creatorFeeBps" && Number(value) > 10000) errors[key] = "Cannot exceed 10000 bps.";
      continue;
    }
    if ((field === "issuerEntity" || field === "jurisdiction") && !value) missing.push(FIELD_META[field as ExtraField].label);
  }

  // Every on-chain venue puts the image in its metadata; mirrors reuse the same one.
  const needsImage = [pad, ...Object.values(mirrors).map((id) => PAD[id!])].some((p) => p.integration === "onchain");
  if (!draft.imageUrl.trim()) {
    if (needsImage) missing.push("Image");
  } else if (!/^(https|ipfs):\/\//.test(draft.imageUrl)) errors.imageUrl = "Must be an https:// or ipfs:// URL.";

  const blocked = missing.length > 0 || Object.keys(errors).length > 0;
  return { errors, missing, issues: blocked ? [...missing, ...Object.values(errors).map(String)] : [] };
}

/* ── Launch run ─────────────────────────────────────────────── */

export type StepState = "pending" | "active" | "done" | "error";
export type Step = { id: string; label: string; detail: string; state: StepState; hash?: string };
export type Leg = { chain: ChainId; pad: Launchpad; mirror: boolean; mint: string; tx: string };

export function buildLegs(pad: Launchpad, draft: Draft, mirrors: Mirrors): Leg[] {
  const seed = `${draft.symbol}-${draft.name}`;
  return [{ pad, mirror: false }, ...Object.values(mirrors).map((id) => ({ pad: PAD[id!], mirror: true }))].map(({ pad, mirror }) => ({
    chain: pad.chain,
    pad,
    mirror,
    mint: mintAddress(pad.chain, `${pad.id}-${seed}`),
    tx: txHash(pad.chain, `${pad.id}-${seed}`),
  }));
}

/** The adapter pipeline for one leg, every step pending. Mirrors reuse the primary's pinned metadata. */
export const buildSteps = (pad: Launchpad, mirror: boolean): Step[] => stepsFor(pad, mirror).map((s) => ({ ...s, state: "pending" }));

/** How long a step stays active in the simulated run, in ms. */
export const stepDuration = (id: string) => (id === "sign" ? 1050 : id === "build" ? 760 : 560);
