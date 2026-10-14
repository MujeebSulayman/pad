import { BASE_FIELDS, DRAFT_KEY } from "../data";
import { xUrl, type Adapter } from "./types";

/** Review venues: the issuance packet is saved to MirrorPad's database and shows as pending. */
export const review: Adapter = {
  steps: () => [{ id: "submit", label: "Submit for review", detail: "Saving the issuance packet" }],
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

/** Believe launches from a post on X: we prefill it, the user posts it. */
export const believe: Adapter = {
  steps: () => [{ id: "post", label: "Post to launch", detail: "Opens X with the launch post prefilled" }],
  run: async (ctx) => {
    ctx.step("post");
    const d = ctx.draft;
    const text = `@launchacoin $${d.symbol} + ${d.name}${d.website ? `\n${d.website}` : ""}`;
    const href = `https://x.com/intent/post?text=${encodeURIComponent(text)}`;
    window.open(href, "_blank", "noopener");
    return { status: "handoff", creator: xUrl(d.twitter) || "x", next: { label: "Open the post on X", href } };
  },
};

/** Venues with no wallet-signable creation API: the launch is finished in the venue's own app. */
function openVenue(detail: string): Adapter {
  return {
    steps: (chain) => [{ id: "open", label: "Continue on the venue", detail: `${detail} · ${chain.shortName}` }],
    run: async (ctx) => {
      ctx.step("open");
      window.open(ctx.pad.url, "_blank", "noopener");
      return { status: "handoff", creator: "", next: { label: `Open ${ctx.pad.name}`, href: ctx.pad.url } };
    },
  };
}

export const virtuals = openVenue("Agent creation happens in the Virtuals app");
export const launchlab = openVenue("Curve setup happens in Raydium's LaunchLab app");
