import { CHAIN, type Launchpad } from "../data";
import { clanker, flaunch, fourmeme, pancakeswap, robinhoodMint, zora } from "./evm";
import { launchlab, review, virtuals } from "./offchain";
import { bags, pumpfun } from "./solana";
import type { Adapter, StepDef } from "./types";

export type { Adapter, LegCtx, LegResult, Meta, StepDef } from "./types";

/** Venue id → the adapter that launches there. */
export const ADAPTERS: Record<string, Adapter> = {
  "robinhood-listings": review,
  "robinhood-chain-mint": robinhoodMint,
  pumpfun,
  bags,
  "raydium-launchlab": launchlab,
  zora,
  clanker,
  flaunch,
  virtuals,
  fourmeme,
  pancakeswap,
  "binance-alpha": review,
};

/** Every step of one leg: shared metadata steps, the venue's own, then indexing. */
export function stepsFor(pad: Launchpad, mirror: boolean): StepDef[] {
  const chain = CHAIN[pad.chain];
  const head: StepDef[] = mirror
    ? [{ id: "reuse", label: "Reuse metadata", detail: "Same name, symbol, description and image" }]
    : [
        { id: "validate", label: "Validate metadata", detail: "Checking name, symbol and socials" },
        { id: "upload", label: "Pin metadata", detail: "Uploading image and metadata to IPFS" },
      ];
  const tail: StepDef =
    pad.integration === "handoff"
      ? { id: "index", label: `Finish on ${pad.name}`, detail: "Not tracked here until the venue launches it" }
      : { id: "index", label: mirror ? "Link to the mirror set" : "Index listing", detail: mirror ? "Grouping with the primary deployment" : "Verifying on-chain and saving to the feed" };
  return [...head, ...ADAPTERS[pad.id].steps(chain), tail];
}
