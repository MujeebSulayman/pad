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
} from "./data";
import { mintAddress, txHash } from "./format";

/** Estimated network gas per deploy, in the chain's native asset. */
export const gasFor = (chain: ChainId) => (chain === "solana" ? 0.0015 : chain === "bsc" ? 0.0009 : 0.00012);

/** The dev buy only counts on venues that take one. */
export const devBuyOf = (pad: Launchpad, draft: Draft) => (pad.fields.includes("devBuy") && Number(draft.devBuy)) || 0;

export type CostLeg = { pad: Launchpad; chain: Chain; mirror: boolean; native: number; usd: number };

/** One leg for the primary venue, then one per mirror. */
export function costLegs(pad: Launchpad, draft: Draft, mirrors: Mirrors): CostLeg[] {
  return [{ pad, mirror: false }, ...Object.values(mirrors).map((id) => ({ pad: PAD[id!], mirror: true }))].map(({ pad, mirror }) => {
    const chain = CHAIN[pad.chain];
    const native = pad.createFee + devBuyOf(pad, draft) + gasFor(pad.chain);
    return { pad, chain, mirror, native, usd: native * (PRICES[chain.nativeToken] ?? 0) };
  });
}

export const totalUsd = (legs: CostLeg[]) => legs.reduce((s, l) => s + l.usd, 0);

/** Venues that queue submissions for review instead of trading at once. */
export const isReviewed = (pad: Launchpad) => pad.status === "approval" || pad.status === "waitlist";

export type Validation = {
  errors: Partial<Record<DraftKey, string>>;
  /** Required fields still empty. */
  missing: string[];
  /** Everything blocking the launch: missing fields, then field errors. */
  issues: string[];
};

export function validate(draft: Draft, pad: Launchpad): Validation {
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

  if (draft.imageUrl && !/^https?:\/\//.test(draft.imageUrl)) errors.imageUrl = "Must be an http(s) URL.";

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

/** The adapter pipeline for one leg. Mirrors reuse the primary's pinned metadata. */
export function buildSteps(pad: Launchpad, mirror: boolean): Step[] {
  const chain = CHAIN[pad.chain];
  const steps: Step[] = mirror
    ? [{ id: "reuse", label: "Reuse metadata", detail: "Same name, symbol, description and image", state: "pending" }]
    : [
        { id: "validate", label: "Validate metadata", detail: "Checking name, symbol and socials", state: "pending" },
        { id: "upload", label: "Pin metadata", detail: pad.chain === "solana" ? "Uploading to Arweave" : "Uploading to IPFS", state: "pending" },
      ];
  steps.push(
    { id: "simulate", label: "Simulate transaction", detail: `Dry-run against ${chain.network}`, state: "pending" },
    { id: "sign", label: "Sign transaction", detail: "Awaiting wallet signature", state: "pending" },
    { id: "submit", label: "Broadcast", detail: `Submitting to ${chain.shortName}`, state: "pending" },
  );
  if (pad.curve === "bonding") steps.push({ id: "curve", label: "Initialize bonding curve", detail: `Curve quoted in ${chain.nativeToken}`, state: "pending" });
  else if (pad.curve === "listing") steps.push({ id: "review", label: "Queue for review", detail: "Submitting the issuance packet", state: "pending" });
  else steps.push({ id: "pool", label: "Seed liquidity", detail: `Opening the ${pad.liquidityDest} position`, state: "pending" });
  steps.push({
    id: "index",
    label: mirror ? "Link to the mirror set" : "Index listing",
    detail: mirror ? "Grouping with the primary deployment" : "Publishing to the aggregator",
    state: "pending",
  });
  return steps;
}

/** How long a step stays active before it completes, in ms. */
export const stepDuration = (id: string) => (id === "sign" ? 1050 : id === "simulate" ? 760 : 560);
