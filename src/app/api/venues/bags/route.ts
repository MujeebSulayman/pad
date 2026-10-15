import { requireUser } from "@/lib/server/auth";
import { BAGS_API_KEY, HttpError, requireConfig } from "@/lib/server/env";
import { FEE_BPS, TREASURY } from "@/lib/fees";
import { jsonBody, optStr, route, str, venueError, venueFetch } from "@/lib/server/http";

const API = "https://public-api-v2.bags.fm/api/v1";
/** Bags' default fee-share config type (from @bagsfm/bags-sdk BAGS_CONFIG_TYPE.DEFAULT). */
const DEFAULT_CONFIG_TYPE = "fa29606e-5e48-4c37-827f-4b03d58ee23d";

type Envelope<T> = { success: boolean; response: T; error?: string };

async function bags<T>(path: string, init: RequestInit): Promise<T> {
  const headers = { "x-api-key": requireConfig(BAGS_API_KEY, "BAGS_API_KEY"), ...init.headers };
  // Name the failing call ("Bags fee-share/config: …") so errors say which step broke.
  const body = await venueFetch<Envelope<T>>(`Bags ${path.split("/").slice(-2).join("/")}`, `${API}${path}`, { ...init, headers });
  if (!body.success) throw new HttpError(502, `Bags ${path}: ${venueError(body) ?? "request failed"}`);
  return body.response;
}

type Body =
  | { step: "token-info"; name: string; symbol: string; description: string; imageUrl: string; twitter?: string; website?: string; telegram?: string }
  | { step: "fee-config"; payer: string; baseMint: string }
  | { step: "launch-tx"; metadataUrl: string; tokenMint: string; wallet: string; initialBuyLamports: number; configKey: string };

/**
 * Bags token launch v2, one step per call:
 * token-info (Bags hosts the metadata and reserves the mint) → fee-config (creator takes 100%) → launch-tx.
 * Transactions come back base58-encoded; the launch tx is already signed by the mint.
 */
export const POST = route(async (req) => {
  await requireUser(req);
  const b = await jsonBody<Body>(req);

  if (b.step === "token-info") {
    const form = new FormData();
    form.append("imageUrl", str(b.imageUrl, "imageUrl", 500));
    form.append("name", str(b.name, "name", 32));
    form.append("symbol", str(b.symbol, "symbol", 10).toUpperCase().replace("$", ""));
    form.append("description", str(b.description, "description", 1000));
    for (const k of ["twitter", "website", "telegram"] as const) {
      const v = optStr(b[k], 200);
      if (v) form.append(k, v);
    }
    return bags<{ tokenMint: string; tokenMetadata: string }>("/token-launch/create-token-info", { method: "POST", body: form });
  }

  if (b.step === "fee-config") {
    const payer = str(b.payer, "payer", 64);
    const res = await bags<{ needsCreation: boolean; transactions?: { transaction: string }[]; meteoraConfigKey: string }>("/fee-share/config", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        payer,
        baseMint: str(b.baseMint, "baseMint", 64),
        // Creator keeps 98% of the creator fees; MirrorPad's treasury takes 2%.
        ...(TREASURY.solana && TREASURY.solana !== payer
          ? { claimersArray: [payer, TREASURY.solana], basisPointsArray: [10_000 - FEE_BPS, FEE_BPS] }
          : { claimersArray: [payer], basisPointsArray: [10_000] }),
        bagsConfigType: DEFAULT_CONFIG_TYPE,
      }),
    });
    return { transactions: (res.transactions ?? []).map((t) => t.transaction), configKey: res.meteoraConfigKey };
  }

  if (b.step === "launch-tx") {
    const lamports = Math.floor(Number(b.initialBuyLamports) || 0);
    if (lamports < 0) throw new HttpError(400, "Initial buy cannot be negative.");
    const transaction = await bags<string>("/token-launch/create-launch-transaction", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        ipfs: str(b.metadataUrl, "metadataUrl", 500),
        tokenMint: str(b.tokenMint, "tokenMint", 64),
        wallet: str(b.wallet, "wallet", 64),
        initialBuyLamports: lamports,
        configKey: str(b.configKey, "configKey", 64),
      }),
    });
    return { transaction };
  }

  throw new HttpError(400, "Unknown step.");
});
