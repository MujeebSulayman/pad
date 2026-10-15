import { EVM_CHAIN_ID } from "@/lib/env";
import { FEE_BPS, TREASURY } from "@/lib/fees";
import { requireUser } from "@/lib/server/auth";
import { HttpError, requireConfig, ZEROX_API_KEY } from "@/lib/server/env";
import { jsonBody, route, str, venueFetch } from "@/lib/server/http";

/** 0x's placeholder address for the chain's native coin (ETH / BNB). */
const NATIVE = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE";

type Body = { chain: "base" | "bsc" | "robinhood"; sellToken: string; buyToken: string; sellAmount: string; taker: string };

/**
 * A firm 0x quote (AllowanceHolder flow) with ShadowPad's 2% taken in the native coin and sent to
 * the treasury by 0x's settlement contract. One side must be native: trades are token ↔ ETH/BNB.
 */
export const POST = route(async (req) => {
  await requireUser(req);
  const key = requireConfig(ZEROX_API_KEY, "ZEROX_API_KEY");
  const b = await jsonBody<Body>(req);
  const chainId = EVM_CHAIN_ID[b.chain];
  if (!chainId) throw new HttpError(400, "Unknown chain.");
  const sellToken = str(b.sellToken, "sellToken", 42);
  const buyToken = str(b.buyToken, "buyToken", 42);
  const isNative = (t: string) => t.toLowerCase() === NATIVE.toLowerCase();
  if (isNative(sellToken) === isNative(buyToken)) throw new HttpError(400, "Trades are token ↔ native coin.");
  if (!/^\d{1,40}$/.test(String(b.sellAmount)) || BigInt(b.sellAmount) <= 0n) throw new HttpError(400, "Invalid amount.");

  const params = new URLSearchParams({
    chainId: String(chainId),
    sellToken,
    buyToken,
    sellAmount: String(b.sellAmount),
    taker: str(b.taker, "taker", 42),
    slippageBps: "500",
  });
  if (TREASURY.evm) {
    params.set("swapFeeRecipient", TREASURY.evm);
    params.set("swapFeeBps", String(FEE_BPS));
    params.set("swapFeeToken", NATIVE);
  }
  const quote = await venueFetch<{ liquidityAvailable?: boolean }>("0x", `https://api.0x.org/swap/allowance-holder/quote?${params}`, {
    headers: { "0x-api-key": key, "0x-version": "v2" },
  });
  if (quote.liquidityAvailable === false) throw new HttpError(404, "No liquidity for this token yet.");
  return quote;
});
