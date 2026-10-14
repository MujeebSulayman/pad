import { CHAIN, type Launchpad } from "../data";
import { clanker, flaunch, fourmeme, pancakeswap, robinhoodMint, zora } from "./evm";
import { review } from "./offchain";
import { bags, pumpfun } from "./solana";
import type { Adapter, StepDef } from "./types";

export type { Adapter, LegCtx, LegResult, Meta, StepDef } from "./types";

/** Venue id → the adapter that launches there. */
export const ADAPTERS: Record<string, Adapter> = {
  "robinhood-listings": review,
  "robinhood-chain-mint": robinhoodMint,
  pumpfun,
  bags,
  zora,
  clanker,
  flaunch,
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
  const tail: StepDef = mirror
    ? { id: "index", label: "Link to the mirror set", detail: "Grouping with the primary deployment" }
    : { id: "index", label: "Index listing", detail: "Verifying on-chain and saving to the feed" };
  return [...head, ...ADAPTERS[pad.id].steps(chain), tail];
}
