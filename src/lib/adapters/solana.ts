import { fromBase58, fromBase64, newMintSigner, sendAndConfirm, signWithMint } from "../solana";
import { requireFunds } from "./funds";
import { solanaSigner, tgUrl, xUrl, type Adapter, type LegCtx } from "./types";

const SIGN = { id: "sign", label: "Sign transaction", detail: "Approve in your wallet" };
const SEND = { id: "submit", label: "Broadcast & confirm", detail: "Simulating, then submitting to Solana" };

/** Pump.fun through PumpPortal's local-transaction API: the mint is a fresh keypair we co-sign with. */
export const pumpfun: Adapter = {
  steps: () => [{ id: "build", label: "Build create transaction", detail: "PumpPortal · pump.fun program" }, SIGN, SEND],
  run: async (ctx: LegCtx) => {
    const sol = solanaSigner(ctx);
    ctx.step("build");
    await requireFunds(ctx, sol.address);
    const mint = await newMintSigner();
    const { transaction } = await ctx.call<{ transaction: string }>("/api/venues/pumpportal", {
      publicKey: sol.address,
      mint: mint.address,
      name: ctx.draft.name,
      symbol: ctx.draft.symbol,
      uri: ctx.meta.metadataUrl,
      devBuy: Number(ctx.draft.devBuy) || 0,
    });
    ctx.step("sign");
    const signed = await sol.signTransaction(await signWithMint(fromBase64(transaction), mint));
    ctx.step("submit");
    const tx = await sendAndConfirm(signed);
    return { status: "success", creator: sol.address, mint: mint.address, tx };
  },
};

/** Bags v2: register token info → fee-share config (creator takes 100%) → launch tx pre-signed by the mint. */
export const bags: Adapter = {
  steps: () => [
    { id: "register", label: "Register with Bags", detail: "Bags hosts the metadata and reserves the mint" },
    { id: "config", label: "Create fee-share config", detail: "You receive 98% of creator fees" },
    { id: "build", label: "Build launch transaction", detail: "Meteora dynamic bonding curve" },
    SIGN,
    SEND,
  ],
  run: async (ctx) => {
    const sol = solanaSigner(ctx);
    const d = ctx.draft;
    ctx.step("register");
    await requireFunds(ctx, sol.address);
    const info = await ctx.call<{ tokenMint: string; tokenMetadata: string }>("/api/venues/bags", {
      step: "token-info",
      name: d.name,
      symbol: d.symbol,
      description: d.description,
      imageUrl: ctx.meta.imageUrl,
      twitter: xUrl(d.twitter),
      website: d.website,
      telegram: tgUrl(d.telegram),
    });

    ctx.step("config");
    const config = await ctx.call<{ transactions: string[]; configKey: string }>("/api/venues/bags", { step: "fee-config", payer: sol.address, baseMint: info.tokenMint });
    for (const [i, t] of config.transactions.entries()) {
      ctx.step("config", `Signing config transaction ${i + 1} of ${config.transactions.length}`);
      await sendAndConfirm(await sol.signTransaction(fromBase58(t)));
    }

    ctx.step("build");
    const { transaction } = await ctx.call<{ transaction: string }>("/api/venues/bags", {
      step: "launch-tx",
      metadataUrl: info.tokenMetadata,
      tokenMint: info.tokenMint,
      wallet: sol.address,
      initialBuyLamports: Math.round((Number(d.devBuy) || 0) * 1e9),
      configKey: config.configKey,
    });
    ctx.step("sign");
    const signed = await sol.signTransaction(fromBase58(transaction));
    ctx.step("submit");
    const tx = await sendAndConfirm(signed);
    return { status: "success", creator: sol.address, mint: info.tokenMint, tx };
  },
};
