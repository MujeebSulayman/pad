import { requireUser } from "@/lib/server/auth";
import { HttpError, JUPITER_API_KEY } from "@/lib/server/env";
import { jsonBody, route, str, venueFetch } from "@/lib/server/http";

const SOL = "So11111111111111111111111111111111111111112";

type Body = { inputMint: string; outputMint: string; amount: string; taker: string };

/**
 * Raw swap instructions from Jupiter's Router (/swap/v2/build). The browser assembles them with
 * MirrorPad's fee transfer into one transaction, so the 2% and the swap land together or not at all.
 * One side must be SOL: trades are always token ↔ SOL.
 */
export const POST = route(async (req) => {
  await requireUser(req);
  const b = await jsonBody<Body>(req);
  const inputMint = str(b.inputMint, "inputMint", 64);
  const outputMint = str(b.outputMint, "outputMint", 64);
  if ((inputMint === SOL) === (outputMint === SOL)) throw new HttpError(400, "Trades are token ↔ SOL.");
  if (!/^\d{1,30}$/.test(String(b.amount)) || BigInt(b.amount) <= 0n) throw new HttpError(400, "Invalid amount.");

  const params = new URLSearchParams({
    inputMint,
    outputMint,
    amount: String(b.amount),
    taker: str(b.taker, "taker", 64),
    slippageBps: "rtse", // Jupiter's real-time slippage estimate: memecoins move fast.
  });
  return venueFetch("Jupiter", `https://api.jup.ag/swap/v2/build?${params}`, {
    headers: JUPITER_API_KEY ? { "x-api-key": JUPITER_API_KEY } : {},
  });
});
