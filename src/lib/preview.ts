/*
 * Local previews for images uploaded this session. A freshly pinned file can take minutes to show
 * up on a public IPFS gateway, so anything that renders an uploaded image uses the in-memory copy.
 */
const local = new Map<string, string>();

/** A blob URL for `file`, shown while the upload runs. */
export const localPreview = (file: Blob) => URL.createObjectURL(file);

/** Remembers that `url` (the pinned gateway URL) is the same image as the local blob. */
export const rememberPreview = (url: string, blobUrl: string) => local.set(url, blobUrl);

/** An IPFS CID in an ipfs:// URI or any gateway URL (…/ipfs/<cid>). */
const cidOf = (url: string) => url.match(/^ipfs:\/\/([^/?#]+)/)?.[1] ?? url.match(/\/ipfs\/([^/?#]+)/)?.[1] ?? null;

/**
 * The best `src` for an image URL: the local copy if we uploaded it this session; for anything on
 * IPFS, our own cached /api/ipfs route (public gateways rate-limit); otherwise the URL itself.
 */
export const previewSrc = (url: string) => {
  const blob = local.get(url);
  if (blob) return blob;
  const cid = cidOf(url);
  return cid ? `/api/ipfs/${cid}` : url;
};
