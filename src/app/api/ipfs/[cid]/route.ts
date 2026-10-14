import { HttpError } from "@/lib/server/env";
import { route } from "@/lib/server/http";
import { IMAGE_TYPES, MAX_IMAGE_BYTES, gatewayUrl } from "@/lib/server/ipfs";

/** CIDv0 (Qm…) or CIDv1 base32 (b…), nothing else. */
const CID = /^(Qm[1-9A-HJ-NP-Za-km-z]{44}|b[a-z2-7]{20,100})$/;

/**
 * Token images, served from our own domain. Public IPFS gateways rate-limit hard (ipfs.io answers
 * 429), so we fetch once from the Pinata gateway and let the CDN keep it: a CID never changes.
 */
export const GET = route(async (_req: Request, { params }: { params: Promise<{ cid: string }> }) => {
  const { cid } = await params;
  if (!CID.test(cid)) throw new HttpError(400, "Not an IPFS CID.");

  const res = await fetch(await gatewayUrl(`ipfs://${cid}`), { signal: AbortSignal.timeout(20_000) });
  const type = res.headers.get("content-type")?.split(";")[0] ?? "";
  if (!res.ok) throw new HttpError(502, `Gateway answered ${res.status}.`);
  if (!IMAGE_TYPES.includes(type)) throw new HttpError(415, "Not an image.");
  const body = await res.arrayBuffer();
  if (body.byteLength > MAX_IMAGE_BYTES) throw new HttpError(413, "Image too large.");

  return new Response(body, {
    headers: {
      "content-type": type,
      // s-maxage lets Vercel's CDN keep it too, so the gateway is hit once per image, not per view.
      "cache-control": "public, max-age=31536000, s-maxage=31536000, immutable",
      "x-content-type-options": "nosniff",
    },
  });
});
