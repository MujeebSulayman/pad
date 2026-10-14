import type { ChainId } from "./data";
import { RPC_URL } from "./env";

async function call<T>(url: string, method: string, params: unknown[]): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  if (!res.ok) throw new Error(`${method}: HTTP ${res.status}`);
  const body = await res.json();
  if (body.error) throw new Error(`${method}: ${body.error.message ?? "RPC error"}`);
  return body.result as T;
}

/** Native balance (SOL / ETH / BNB) of `address` on `chain`, or null when the chain has no RPC. */
export async function nativeBalance(chain: ChainId, address: string): Promise<number | null> {
  const url = RPC_URL[chain];
  if (!url) return null;
  if (chain === "solana") {
    const r = await call<{ value: number }>(url, "getBalance", [address, { commitment: "confirmed" }]);
    return r.value / 1e9;
  }
  const hex = await call<string>(url, "eth_getBalance", [address, "latest"]);
  return Number(BigInt(hex)) / 1e18;
}
