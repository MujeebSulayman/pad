import "server-only";
import { HttpError, IPFS_GATEWAY, PINATA_JWT, requireConfig } from "./env";

export type Pinned = { cid: string; uri: string; url: string };

const pinned = (cid: string): Pinned => ({ cid, uri: `ipfs://${cid}`, url: `${IPFS_GATEWAY}/ipfs/${cid}` });

/** Pins a file to public IPFS through Pinata. */
export async function pinFile(file: Blob, name: string): Promise<Pinned> {
  const form = new FormData();
  form.append("network", "public");
  form.append("name", name);
  form.append("file", file, name);
  const res = await fetch("https://uploads.pinata.cloud/v3/files", {
    method: "POST",
    headers: { authorization: `Bearer ${requireConfig(PINATA_JWT, "PINATA_JWT")}` },
    body: form,
  });
  const body = await res.json().catch(() => null);
  if (!res.ok || !body?.data?.cid) throw new HttpError(502, `IPFS pin failed: ${body?.error?.message ?? res.statusText}`);
  return pinned(body.data.cid);
}

export const pinJson = (value: unknown, name: string) =>
  pinFile(new Blob([JSON.stringify(value)], { type: "application/json" }), name.endsWith(".json") ? name : `${name}.json`);

export const IMAGE_TYPES = ["image/png", "image/jpeg", "image/gif", "image/webp"];
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

/** ipfs://cid or …/ipfs/cid → cid, so already-pinned images aren't pinned twice. */
export const cidOf = (url: string) => url.match(/^ipfs:\/\/(.+)$/)?.[1] ?? url.match(/\/ipfs\/([^/?#]+)/)?.[1] ?? null;

/** Pulls a remote image and pins it, so every venue reads the same immutable copy. */
export async function pinRemoteImage(url: string): Promise<Pinned> {
  const cid = cidOf(url);
  if (cid) return pinned(cid);
  if (!/^https:\/\//.test(url)) throw new HttpError(400, "Image must be an https:// URL or an uploaded file.");
  const res = await fetch(url, { redirect: "follow" });
  const type = res.headers.get("content-type")?.split(";")[0] ?? "";
  if (!res.ok || !IMAGE_TYPES.includes(type)) throw new HttpError(400, "The image URL did not return a PNG, JPG, GIF or WebP.");
  const blob = await res.blob();
  if (blob.size > MAX_IMAGE_BYTES) throw new HttpError(400, "Image is larger than 5 MB.");
  return pinFile(blob, `image.${type.split("/")[1]}`);
}

/** Gateway URL for an ipfs:// URI; anything else passes through. */
export const gatewayUrl = (uri: string) => (uri.startsWith("ipfs://") ? `${IPFS_GATEWAY}/ipfs/${uri.slice(7)}` : uri);
