import { createPublicClient, http, parseAbi, parseEther, toHex } from "viem";
import { RPC_URL } from "@/lib/env";
import { VIEM_CHAIN } from "@/lib/evm-chains";
import { requireUser } from "@/lib/server/auth";
import { HttpError } from "@/lib/server/env";
import { jsonBody, optStr, route, str, venueFetch } from "@/lib/server/http";
import { gatewayUrl, IMAGE_TYPES } from "@/lib/server/ipfs";

const API = "https://four.meme/meme-api/v1";
const TOKEN_MANAGER2 = "0x5c952063c7fc8610FFDB798152D69F0B9550762b" as const;
const TM2_ABI = parseAbi(["function _launchFee() view returns (uint256)", "function _tradingFeeRate() view returns (uint256)"]);

type FourEnvelope<T> = { code: string | number; data: T; msg?: string };

async function four<T>(path: string, init: RequestInit): Promise<T> {
  const body = await venueFetch<FourEnvelope<T>>("Four.meme", `${API}${path}`, init);
  if (String(body.code) !== "0") throw new HttpError(502, `Four.meme: ${body.msg ?? JSON.stringify(body).slice(0, 200)}`);
  return body.data;
}

type Body =
  | { step: "nonce"; address: string }
  | {
      step: "create";
      address: string;
      signature: string;
      name: string;
      symbol: string;
      description: string;
      image: string;
      website?: string;
      twitter?: string;
      telegram?: string;
      devBuy?: number;
    };

const toHexArg = (v: string) => (v.startsWith("0x") ? v : /^[0-9a-f]+$/i.test(v) ? `0x${v}` : toHex(Buffer.from(v, "base64")));

/**
 * Four.meme on BSC: nonce → the user signs "You are sign in Meme {nonce}" → login, image upload and
 * create on four.meme's API → it returns createArg + signature for TokenManager2.createToken, which
 * the user sends with the launch fee (+ dev buy and its trading fee).
 */
export const POST = route(async (req) => {
  await requireUser(req);
  const b = await jsonBody<Body>(req);

  if (b.step === "nonce") {
    const nonce = await four<string>("/private/user/nonce/generate", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ accountAddress: str(b.address, "address", 64), verifyType: "LOGIN", networkCode: "BSC" }),
    });
    return { message: `You are sign in Meme ${nonce}` };
  }

  if (b.step !== "create") throw new HttpError(400, "Unknown step.");
  const address = str(b.address, "address", 64);

  const accessToken = await four<string>("/private/user/login/dex", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      region: "WEB",
      langType: "EN",
      loginIp: "",
      inviteCode: "",
      verifyInfo: { address, networkCode: "BSC", signature: str(b.signature, "signature", 200), verifyType: "LOGIN" },
      walletName: "MetaMask",
    }),
  });

  const img = await fetch(await gatewayUrl(str(b.image, "image", 500)));
  const type = img.headers.get("content-type")?.split(";")[0] ?? "";
  if (!img.ok || !IMAGE_TYPES.includes(type)) throw new HttpError(400, "Could not read the token image.");
  const upload = new FormData();
  upload.append("file", new Blob([await img.arrayBuffer()], { type }), `logo.${type.split("/")[1]}`);
  const imgUrl = await four<string>("/private/token/upload", { method: "POST", headers: { "meme-web-access": accessToken }, body: upload });

  type RaisedToken = { symbol: string; status?: string; totalAmount?: string | number; totalBAmount?: string | number; saleRate?: string | number };
  const configs = await four<RaisedToken[]>("/public/config", { method: "GET" });
  const published = configs.filter((c) => c.status === "PUBLISH");
  const raisedToken = (published.length ? published : configs).find((c) => c.symbol === "BNB") ?? configs[0];
  if (!raisedToken) throw new HttpError(502, "Four.meme: no raise token configured.");

  const devBuy = Math.max(0, Number(b.devBuy) || 0);
  const created = await four<{ createArg: string; signature: string }>("/private/token/create", {
    method: "POST",
    headers: { "meme-web-access": accessToken, "content-type": "application/json" },
    body: JSON.stringify({
      name: str(b.name, "name", 64),
      shortName: str(b.symbol, "symbol", 16),
      desc: str(b.description, "description", 2000),
      totalSupply: Number(raisedToken.totalAmount ?? 1_000_000_000),
      raisedAmount: Number(raisedToken.totalBAmount ?? 24),
      saleRate: Number(raisedToken.saleRate ?? 0.8),
      reserveRate: 0,
      imgUrl,
      raisedToken,
      launchTime: Date.now(),
      funGroup: false,
      label: "Meme",
      lpTradingFee: 0.0025,
      preSale: String(devBuy),
      clickFun: false,
      symbol: raisedToken.symbol,
      dexType: "PANCAKE_SWAP",
      rushMode: false,
      onlyMPC: false,
      feePlan: false,
      ...(optStr(b.website) && { webUrl: optStr(b.website) }),
      ...(optStr(b.twitter) && { twitterUrl: optStr(b.twitter) }),
      ...(optStr(b.telegram) && { telegramUrl: optStr(b.telegram) }),
    }),
  });

  // Value to send: the launch fee, plus the dev buy and its trading fee when the curve is in BNB.
  const client = createPublicClient({ chain: VIEM_CHAIN.bsc, transport: http(RPC_URL.bsc) });
  let value = await client.readContract({ address: TOKEN_MANAGER2, abi: TM2_ABI, functionName: "_launchFee" });
  if (devBuy > 0 && raisedToken.symbol === "BNB") {
    const presale = parseEther(String(devBuy));
    const feeRate = await client.readContract({ address: TOKEN_MANAGER2, abi: TM2_ABI, functionName: "_tradingFeeRate" });
    value += presale + (presale * feeRate) / 10000n;
  }

  return { createArg: toHexArg(created.createArg), signature: toHexArg(created.signature), value: value.toString(), tokenManager: TOKEN_MANAGER2 };
});
