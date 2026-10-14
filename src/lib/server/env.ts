import "server-only";

/*
 * Server-only config. None of these are NEXT_PUBLIC_, so they never reach the browser.
 * Each feature reports itself unavailable (503) when its keys are missing instead of crashing.
 */

const clean = (v: string | undefined) => (v ?? "").trim();

export const DATABASE_URL = clean(process.env.DATABASE_URL);
/** Privy app id (shared with the client). The verification key is optional: without it, Privy's published keys are used. */
export const PRIVY_APP_ID = clean(process.env.NEXT_PUBLIC_PRIVY_APP_ID);
export const PRIVY_VERIFICATION_KEY = clean(process.env.PRIVY_VERIFICATION_KEY).replace(/\\n/g, "\n");
export const PINATA_JWT = clean(process.env.PINATA_JWT);
/**
 * Public gateway for pinned files, e.g. https://<name>.mypinata.cloud. Defaults to Pinata's shared
 * gateway: ipfs.io and dweb.link now answer 429 to server traffic.
 */
export const IPFS_GATEWAY = (clean(process.env.PINATA_GATEWAY) || "https://gateway.pinata.cloud").replace(/\/$/, "");
export const BAGS_API_KEY = clean(process.env.BAGS_API_KEY);
export const ZORA_API_KEY = clean(process.env.ZORA_API_KEY);

/** Thrown by route helpers; turned into a JSON error response. */
export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export function requireConfig(value: string, name: string): string {
  if (!value) throw new HttpError(503, `${name} is not configured on the server.`);
  return value;
}
