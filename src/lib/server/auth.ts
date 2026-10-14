import "server-only";
import { importSPKI, jwtVerify, type CryptoKey } from "jose";
import { HttpError, PRIVY_APP_ID, PRIVY_VERIFICATION_KEY, requireConfig } from "./env";

let key: Promise<CryptoKey> | null = null;

/**
 * The Privy user behind a request, from its `Authorization: Bearer <access token>` header.
 * Privy access tokens are ES256 JWTs whose audience is the app id.
 */
export async function requireUser(req: Request): Promise<string> {
  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) throw new HttpError(401, "Sign in to continue.");

  requireConfig(PRIVY_APP_ID, "NEXT_PUBLIC_PRIVY_APP_ID");
  key ??= importSPKI(requireConfig(PRIVY_VERIFICATION_KEY, "PRIVY_VERIFICATION_KEY"), "ES256");
  try {
    const { payload } = await jwtVerify(token, await key, { audience: PRIVY_APP_ID });
    if (!payload.sub) throw new Error("no subject");
    return payload.sub;
  } catch {
    throw new HttpError(401, "Your session has expired. Sign in again.");
  }
}
