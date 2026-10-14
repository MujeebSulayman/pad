import { requireUser } from "@/lib/server/auth";
import { jsonBody, optStr, route, str } from "@/lib/server/http";
import { pinJson, pinRemoteImage } from "@/lib/server/ipfs";

type Body = {
  name: string;
  symbol: string;
  description: string;
  image: string;
  website?: string;
  twitter?: string;
  telegram?: string;
  /** Issuance venues record who issued the token. */
  issuerEntity?: string;
  jurisdiction?: string;
};

const xUrl = (handle?: string) => (!handle ? undefined : /^https?:\/\//.test(handle) ? handle : `https://x.com/${handle.replace(/^@/, "")}`);
const tgUrl = (v?: string) => (!v ? undefined : /^https?:\/\//.test(v) ? v : `https://${v.replace(/^\/+/, "")}`);

/**
 * Pins the token's metadata JSON (Metaplex-style: name, symbol, description, image, socials).
 * The image is pinned too if it isn't on IPFS already. Returns both the image and metadata URIs.
 */
export const POST = route(async (req) => {
  await requireUser(req);
  const b = await jsonBody<Body>(req);
  const image = await pinRemoteImage(str(b.image, "image", 500));
  const name = str(b.name, "name", 64);
  const symbol = str(b.symbol, "symbol", 16);
  const metadata = {
    name,
    symbol,
    description: str(b.description, "description", 2000),
    image: image.uri,
    website: optStr(b.website, 200),
    twitter: xUrl(optStr(b.twitter, 200)),
    telegram: tgUrl(optStr(b.telegram, 200)),
    issuer: optStr(b.issuerEntity, 200) ? { entity: optStr(b.issuerEntity, 200), jurisdiction: optStr(b.jurisdiction, 200) } : undefined,
    showName: true,
    createdOn: "MirrorPad",
  };
  const pinned = await pinJson(metadata, `${symbol}-metadata`);
  return { image, metadata: pinned, json: metadata };
});
