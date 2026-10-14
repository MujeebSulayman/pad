import type { Signer } from "@/components/wallet/context";
import type { Chain, Draft, Launchpad } from "../data";

/** The token's pinned media, shared by every leg of a run. */
export type Meta = { imageUri: string; imageUrl: string; metadataUri: string; metadataUrl: string };

export type StepDef = { id: string; label: string; detail: string };

export type LegCtx = {
  pad: Launchpad;
  draft: Draft;
  meta: Meta;
  signer: Signer;
  /** Authenticated POST to one of our API routes. */
  call: <T>(path: string, body: unknown) => Promise<T>;
  /** Marks step `id` active (every earlier step done), optionally replacing its detail line. */
  step: (id: string, detail?: string) => void;
};

export type LegResult = {
  /** success: confirmed on-chain. pending: submitted for review. */
  status: "success" | "pending";
  creator: string;
  mint?: string;
  tx?: string;
  details?: Record<string, string>;
  /** A follow-up for the user, e.g. seeding a pool. */
  next?: { label: string; href: string };
};

export type Adapter = {
  steps: (chain: Chain) => StepDef[];
  run: (ctx: LegCtx) => Promise<LegResult>;
};

export function solanaSigner(ctx: LegCtx) {
  if (!ctx.signer.solana) throw new Error("Connect a Solana wallet to launch here.");
  return ctx.signer.solana;
}

export function evmSigner(ctx: LegCtx) {
  if (!ctx.signer.evm) throw new Error("Connect an EVM wallet to launch here.");
  return ctx.signer.evm;
}

/** "@handle" or a URL → a full x.com URL. */
export const xUrl = (v: string) => (!v ? "" : /^https?:\/\//.test(v) ? v : `https://x.com/${v.replace(/^@/, "")}`);
export const tgUrl = (v: string) => (!v ? "" : /^https?:\/\//.test(v) ? v : `https://${v.replace(/^\/+/, "")}`);
