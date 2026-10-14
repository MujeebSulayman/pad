import { requireUser } from "@/lib/server/auth";
import { HttpError } from "@/lib/server/env";
import { jsonBody, route, str } from "@/lib/server/http";

type Body = { publicKey: string; mint: string; name: string; symbol: string; uri: string; devBuy: number; pool: "pump" | "bonk" };

/**
 * Builds an unsigned create transaction through PumpPortal's local-transaction API.
 * pool "pump" → Pump.fun; pool "bonk" → LetsBonk's platform on Raydium LaunchLab.
 * The client signs it with the fresh mint keypair and the user's wallet.
 */
export const POST = route(async (req) => {
  await requireUser(req);
  const b = await jsonBody<Body>(req);
  if (b.pool !== "pump" && b.pool !== "bonk") throw new HttpError(400, "Unknown pool.");
  const devBuy = Number(b.devBuy) || 0;
  if (devBuy < 0 || devBuy > 100) throw new HttpError(400, "Dev buy must be between 0 and 100 SOL.");

  const res = await fetch("https://pumpportal.fun/api/trade-local", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      publicKey: str(b.publicKey, "publicKey", 64),
      action: "create",
      tokenMetadata: { name: str(b.name, "name", 32), symbol: str(b.symbol, "symbol", 10), uri: str(b.uri, "uri", 300) },
      mint: str(b.mint, "mint", 64),
      denominatedInSol: "true",
      amount: devBuy,
      slippage: 10,
      priorityFee: 0.0005,
      pool: b.pool,
    }),
  });
  if (!res.ok) throw new HttpError(502, `PumpPortal: ${(await res.text()).slice(0, 200) || res.statusText}`);
  const bytes = new Uint8Array(await res.arrayBuffer());
  return { transaction: Buffer.from(bytes).toString("base64") };
});
