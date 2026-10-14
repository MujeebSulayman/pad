import "server-only";
import { createRemoteJWKSet, importSPKI, jwtVerify, type JWTVerifyGetKey, type CryptoKey } from "jose";
import { HttpError, PRIVY_APP_ID, PRIVY_VERIFICATION_KEY, requireConfig } from "./env";

let key: CryptoKey | JWTVerifyGetKey | null = null;

/**
 * Privy's public signing key: the pasted verification key if set, otherwise the app's published
 * key set (fetched once, cached, and refreshed when Privy rotates keys).
 */
async function verificationKey(appId: string) {
  key ??= PRIVY_VERIFICATION_KEY
    ? await importSPKI(PRIVY_VERIFICATION_KEY, "ES256")
    : createRemoteJWKSet(new URL(`https://auth.privy.io/api/v1/apps/${appId}/jwks.json`));
  return key;
}

/**
 * The Privy user behind a request, from its `Authorization: Bearer <access token>` header.
 * Privy access tokens are ES256 JWTs whose audience is the app id.
 */
export async function requireUser(req: Request): Promise<string> {
  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) throw new HttpError(401, "Sign in to continue.");

  const appId = requireConfig(PRIVY_APP_ID, "NEXT_PUBLIC_PRIVY_APP_ID");
  const k = await verificationKey(appId);
  try {
    const { payload } = typeof k === "function" ? await jwtVerify(token, k, { audience: appId }) : await jwtVerify(token, k, { audience: appId });
    if (!payload.sub) throw new Error("no subject");
    return payload.sub;
  } catch {
    throw new HttpError(401, "Your session has expired. Sign in again.");
  }
}
