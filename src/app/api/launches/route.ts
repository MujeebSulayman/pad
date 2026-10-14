import { after } from "next/server";
import { FIELD_META, PAD, type ChainId, type Launch, type LaunchStatus } from "@/lib/data";
import { requireUser } from "@/lib/server/auth";
import { db } from "@/lib/server/db";
import { HttpError } from "@/lib/server/env";
import { jsonBody, optStr, route, str } from "@/lib/server/http";
import { gatewayUrl } from "@/lib/server/ipfs";
import { refreshMarketCaps } from "@/lib/server/market";
import { verifyLaunchTx } from "@/lib/server/verify";

export const dynamic = "force-dynamic";

type Row = {
  id: string;
  launchpad_id: string;
  chain: ChainId;
  name: string;
  symbol: string;
  image_url: string;
  created_at: string;
  status: LaunchStatus;
  tx_hash: string | null;
  mint_address: string | null;
  market_cap_usd: number;
  mirror_group: string | null;
  mirror_count: number | null;
};

const toLaunch = (r: Row): Launch => ({
  id: r.id,
  launchpadId: r.launchpad_id,
  chain: r.chain,
  name: r.name,
  symbol: r.symbol,
  imageUrl: gatewayUrl(r.image_url),
  createdAt: new Date(r.created_at).getTime(),
  status: r.status,
  txHash: r.tx_hash ?? "",
  mintAddress: r.mint_address ?? "",
  marketCapUsd: r.market_cap_usd,
  mirrorGroup: r.mirror_group ?? undefined,
  mirrorCount: r.mirror_count ?? undefined,
});

/** The activity feed, newest first. `?creator=` narrows it to one wallet. */
export const GET = route(async (req) => {
  const sql = await db();
  const creator = new URL(req.url).searchParams.get("creator");
  const rows = (
    creator
      ? await sql`select * from launches where creator = ${creator} order by created_at desc limit 100`
      : await sql`select * from launches order by created_at desc limit 50`
  ) as Row[];
  // Market caps refresh after the response is sent, so the feed never waits on DexScreener.
  after(() => refreshMarketCaps().catch((e) => console.error("market cap refresh", e)));
  return { launches: rows.map(toLaunch) };
});

type LegBody = {
  launchpadId: string;
  creator: string;
  status: LaunchStatus;
  mint?: string;
  txHash?: string;
  error?: string;
  mirrorGroup?: string;
  mirrorCount?: number;
  token: { name: string; symbol: string; description?: string; imageUrl?: string; metadataUri?: string };
  details?: Record<string, string>;
};

/** Extra fields a review venue requires when it asks for them. */
const REVIEW_REQUIRED = ["issuerEntity", "jurisdiction"] as const;

const UUID =/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Records one leg of a launch run. Successful on-chain legs are verified against the chain first. */
export const POST = route(async (req) => {
  const userId = await requireUser(req);
  const b = await jsonBody<LegBody>(req);
  const pad = PAD[b.launchpadId];
  if (!pad) throw new HttpError(400, "Unknown launchpad.");
  if (!["success", "pending", "failed"].includes(b.status)) throw new HttpError(400, "Invalid status.");
  if (b.mirrorGroup && !UUID.test(b.mirrorGroup)) throw new HttpError(400, "Invalid mirror group.");

  const creator = str(b.creator, "creator", 64);
  const mint = optStr(b.mint, 64);
  const txHash = optStr(b.txHash, 100);

  if (b.status === "success") {
    if (pad.integration !== "onchain") throw new HttpError(400, `${pad.name} launches are recorded as pending, not live.`);
    if (!mint || !txHash) throw new HttpError(400, "A live launch needs its token address and transaction.");
    await verifyLaunchTx(pad.chain, txHash, creator, mint);
  }
  if (b.status === "pending" && pad.integration !== "review") throw new HttpError(400, "Only review submissions are recorded as pending.");

  const details = Object.fromEntries(
    Object.entries(b.details ?? {})
      .filter(([, v]) => typeof v === "string" && v.trim())
      .slice(0, 20)
      .map(([k, v]) => [k.slice(0, 40), v.slice(0, 500)]),
  );

  // Review submissions must carry the same required fields the form enforces (see validate in lib/launch).
  if (pad.integration === "review" && b.status === "pending") {
    if (!optStr(b.token?.description)) throw new HttpError(400, "Description is required.");
    for (const f of REVIEW_REQUIRED) {
      if (pad.fields.includes(f) && !details[f]?.trim()) throw new HttpError(400, `${FIELD_META[f].label} is required for ${pad.name}.`);
    }
  }

  const sql = await db();
  const [row] = (await sql`
    insert into launches (mirror_group, mirror_count, launchpad_id, chain, name, symbol, description, image_url, metadata_uri,
                          creator, privy_user_id, mint_address, tx_hash, status, error, details)
    values (${b.mirrorGroup ?? null}, ${b.mirrorCount ?? null}, ${pad.id}, ${pad.chain},
            ${str(b.token?.name, "name", 64)}, ${str(b.token?.symbol, "symbol", 16)}, ${optStr(b.token.description, 2000) ?? ""},
            ${optStr(b.token.imageUrl, 500) ?? ""}, ${optStr(b.token.metadataUri, 500) ?? null},
            ${creator}, ${userId}, ${mint ?? null}, ${txHash ?? null}, ${b.status}, ${optStr(b.error, 500) ?? null}, ${JSON.stringify(details)})
    on conflict (chain, tx_hash) where tx_hash is not null do update set status = excluded.status
    returning *`) as Row[];
  return { launch: toLaunch(row) };
});
