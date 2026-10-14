import { isAddressEqual, type Address, type Hex } from "viem";
import { requireUser } from "@/lib/server/auth";
import { HttpError, ZORA_API_KEY } from "@/lib/server/env";
import { jsonBody, route, str, venueFetch } from "@/lib/server/http";

/** Zora's coin factory on Base (from @zoralabs/protocol-deployments). The API's call must target it. */
const ZORA_FACTORY: Address = "0x777777751622c0d3258f214F9DF38E35BF45baF3";

type Body = { creator: string; name: string; symbol: string; uri: string };
type CreateContent = { calls: { to: Address; data: Hex; value: string }[]; predictedCoinAddress: Address };

/**
 * Zora content coin on Base, ETH-paired: Zora's API returns the factory calldata, the user sends it.
 * Same request and checks as @zoralabs/coins-sdk createCoinCall + validateCreateCoinCalls.
 */
export const POST = route(async (req) => {
  await requireUser(req);
  const b = await jsonBody<Body>(req);
  const res = await venueFetch<CreateContent>("Zora", "https://api-sdk.zora.engineering/create/content", {
    method: "POST",
    headers: { "content-type": "application/json", ...(ZORA_API_KEY && { "api-key": ZORA_API_KEY }) },
    body: JSON.stringify({
      currency: "ETH",
      chainId: 8453,
      metadata: { type: "RAW_URI", uri: str(b.uri, "uri", 300) },
      creator: str(b.creator, "creator", 64),
      name: str(b.name, "name", 64),
      symbol: str(b.symbol, "symbol", 16),
    }),
  });
  const call = res.calls?.[0];
  if (res.calls?.length !== 1 || !call || !isAddressEqual(call.to, ZORA_FACTORY) || BigInt(call.value) !== 0n) {
    throw new HttpError(502, "Zora returned an unexpected create call.");
  }
  return { to: call.to, data: call.data, value: "0", coin: res.predictedCoinAddress };
});
