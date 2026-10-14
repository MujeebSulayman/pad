import { requireUser } from "@/lib/server/auth";
import { HttpError, JUPITER_API_KEY, requireConfig } from "@/lib/server/env";
import { jsonBody, optStr, route, str, venueFetch } from "@/lib/server/http";
import { gatewayUrl, IMAGE_TYPES } from "@/lib/server/ipfs";

const API = "https://api.jup.ag/studio/v1";
const USDC = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";

type CreateBody = {
  step: "create";
  creator: string;
  name: string;
  symbol: string;
  description: string;
  image: string;
  website?: string;
  twitter?: string;
  telegram?: string;
  migrationMarketCap: number;
};
type SubmitBody = { step: "submit"; transaction: string; owner: string; content?: string };

type CreateTx = { transaction: string; mint: string; imagePresignedUrl: string; metadataPresignedUrl: string; imageUrl: string };

/**
 * Jupiter Studio (Meteora DBC): create-tx → upload image + metadata to Jupiter's presigned URLs →
 * the user signs → submit. Curve is quoted in USDC, LP locked, anti-sniping on.
 */
export const POST = route(async (req) => {
  await requireUser(req);
  const key = requireConfig(JUPITER_API_KEY, "JUPITER_API_KEY");
  const b = await jsonBody<CreateBody | SubmitBody>(req);

  if (b.step === "create") {
    const img = await fetch(gatewayUrl(str(b.image, "image", 500)));
    const type = img.headers.get("content-type")?.split(";")[0] ?? "";
    if (!img.ok || !IMAGE_TYPES.includes(type)) throw new HttpError(400, "Could not read the token image.");
    const imageBytes = await img.arrayBuffer();

    const migration = Math.max(20_000, Math.min(Number(b.migrationMarketCap) || 75_000, 10_000_000));
    const tx = await venueFetch<CreateTx>("Jupiter Studio", `${API}/dbc-pool/create-tx`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": key },
      body: JSON.stringify({
        buildCurveByMarketCapParam: {
          quoteMint: USDC,
          initialMarketCap: 16_000,
          migrationMarketCap: migration,
          tokenQuoteDecimal: 6,
          lockedVestingParam: { totalLockedVestingAmount: 0, cliffUnlockAmount: 0, numberOfVestingPeriod: 0, totalVestingDuration: 0, cliffDurationFromMigrationTime: 0 },
        },
        antiSniping: true,
        fee: { feeBps: 100 },
        isLpLocked: true,
        tokenName: str(b.name, "name", 32),
        tokenSymbol: str(b.symbol, "symbol", 10),
        tokenImageContentType: type,
        creator: str(b.creator, "creator", 64),
      }),
    });

    const put = (url: string, body: BodyInit, contentType: string) => fetch(url, { method: "PUT", headers: { "content-type": contentType }, body });
    const imgPut = await put(tx.imagePresignedUrl, imageBytes, type);
    const metaPut = await put(
      tx.metadataPresignedUrl,
      JSON.stringify({
        name: b.name,
        symbol: b.symbol,
        description: str(b.description, "description", 2000),
        image: tx.imageUrl,
        website: optStr(b.website, 200) ?? "",
        twitter: optStr(b.twitter, 200) ?? "",
        telegram: optStr(b.telegram, 200) ?? "",
      }),
      "application/json",
    );
    if (!imgPut.ok || !metaPut.ok) throw new HttpError(502, "Jupiter Studio: metadata upload failed.");
    return { transaction: tx.transaction, mint: tx.mint, imageUrl: tx.imageUrl, metadataUri: `https://static-create.jup.ag/metadata/${tx.mint}.json` };
  }

  if (b.step === "submit") {
    const form = new FormData();
    form.append("transaction", str(b.transaction, "transaction", 4000));
    form.append("owner", str(b.owner, "owner", 64));
    form.append("content", optStr(b.content, 2000) ?? "");
    return venueFetch<unknown>("Jupiter Studio", `${API}/dbc-pool/submit`, { method: "POST", headers: { "x-api-key": key }, body: form });
  }

  throw new HttpError(400, "Unknown step.");
});
