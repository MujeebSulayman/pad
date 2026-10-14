import "server-only";
import type { ChainId, NativeToken } from "../data";
import { PRICES } from "../data";
import { db } from "./db";

/** DexScreener's chain slugs. Robinhood Chain isn't indexed there yet. */
const DEX_CHAIN: Partial<Record<ChainId, string>> = { solana: "solana", base: "base", bsc: "bsc" };
const STALE_MS = 5 * 60_000;

type Pair = { baseToken: { address: string }; marketCap?: number; fdv?: number; liquidity?: { usd?: number } };

/** Market cap per token address (lowercased for EVM), from the most liquid pair DexScreener knows. */
async function marketCaps(chain: ChainId, addresses: string[]): Promise<Map<string, number>> {
  const out = new Map<string, number>();
  const slug = DEX_CHAIN[chain];
  if (!slug) return out;
  for (let i = 0; i < addresses.length; i += 30) {
    const batch = addresses.slice(i, i + 30);
    const res = await fetch(`https://api.dexscreener.com/tokens/v1/${slug}/${batch.join(",")}`);
    if (!res.ok) continue;
    const pairs = (await res.json()) as Pair[];
    const best = new Map<string, Pair>();
    for (const p of pairs) {
      const key = chain === "solana" ? p.baseToken.address : p.baseToken.address.toLowerCase();
      const cur = best.get(key);
      if (!cur || (p.liquidity?.usd ?? 0) > (cur.liquidity?.usd ?? 0)) best.set(key, p);
    }
    for (const [k, p] of best) out.set(k, p.marketCap ?? p.fdv ?? 0);
  }
  return out;
}

/** Refreshes market caps that are older than five minutes, for launches from the last 30 days. */
export async function refreshMarketCaps() {
  const sql = await db();
  const rows = (await sql`
    select id, chain, mint_address from launches
    where status = 'success' and mint_address is not null
      and created_at > now() - interval '30 days'
      and (market_cap_at is null or market_cap_at < now() - make_interval(secs => ${STALE_MS / 1000}))
    limit 300`) as { id: string; chain: ChainId; mint_address: string }[];
  const byChain = new Map<ChainId, typeof rows>();
  for (const r of rows) byChain.set(r.chain, [...(byChain.get(r.chain) ?? []), r]);
  for (const [chain, list] of byChain) {
    const caps = await marketCaps(chain, list.map((r) => r.mint_address)).catch(() => new Map<string, number>());
    for (const r of list) {
      const cap = caps.get(chain === "solana" ? r.mint_address : r.mint_address.toLowerCase());
      await sql`update launches set market_cap_at = now(), market_cap_usd = coalesce(${cap ?? null}, market_cap_usd) where id = ${r.id}`;
    }
  }
}

const COINGECKO_ID: Record<NativeToken, string> = { SOL: "solana", ETH: "ethereum", BNB: "binancecoin" };

/** Native token USD prices from CoinGecko, falling back to the reference prices. */
export async function nativePrices(): Promise<Record<NativeToken, number>> {
  try {
    const ids = Object.values(COINGECKO_ID).join(",");
    const res = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd`, { next: { revalidate: 60 } });
    if (!res.ok) throw new Error(res.statusText);
    const body = (await res.json()) as Record<string, { usd?: number }>;
    const entries = Object.entries(COINGECKO_ID).map(([sym, id]) => [sym, body[id]?.usd ?? PRICES[sym as NativeToken]]);
    return Object.fromEntries(entries) as Record<NativeToken, number>;
  } catch {
    return PRICES;
  }
}
