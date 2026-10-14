import { BASE_FIELDS, DRAFT_KEY } from "../data";
import type { Adapter } from "./types";

/** Review venues: the issuance packet is saved to MirrorPad's database and shows as pending. */
export const review: Adapter = {
  steps: () => [{ id: "submit", label: "Prepare submission", detail: "Packaging the issuer details for the venue's review" }],
  run: async (ctx) => {
    const creator = ctx.pad.chain === "solana" ? ctx.signer.solana?.address : ctx.signer.evm?.address;
    if (!creator) throw new Error("Connect a wallet for this chain to submit.");
    ctx.step("submit");
    const details: Record<string, string> = { metadataUri: ctx.meta.metadataUri };
    for (const f of ctx.pad.fields) {
      if (!BASE_FIELDS.includes(f) && ctx.draft[DRAFT_KEY[f]]) details[f] = ctx.draft[DRAFT_KEY[f]];
    }
    return { status: "pending", creator, details, next: { label: `Open ${ctx.pad.name}`, href: ctx.pad.url } };
  },
};

