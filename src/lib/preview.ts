/*
 * Local previews for images uploaded this session. A freshly pinned file can take minutes to show
 * up on a public IPFS gateway, so anything that renders an uploaded image uses the in-memory copy.
 */
const local = new Map<string, string>();

/** A blob URL for `file`, shown while the upload runs. */
export const localPreview = (file: Blob) => URL.createObjectURL(file);

/** Remembers that `url` (the pinned gateway URL) is the same image as the local blob. */
export const rememberPreview = (url: string, blobUrl: string) => local.set(url, blobUrl);

/** The best `src` for an image URL: the local copy if we uploaded it, otherwise the URL itself. */
export const previewSrc = (url: string) => local.get(url) ?? url;
