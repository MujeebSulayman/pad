import type { ChainId } from "./data";

export const cn = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");

/** $412K, $1.2M, $850 */
export const fmtUsd = (n: number) =>
  n >= 1e6 ? `$${(n / 1e6).toFixed(n >= 1e7 ? 0 : 1)}M` : n >= 1e3 ? `$${(n / 1e3).toFixed(n >= 1e5 ? 0 : 1)}K` : `$${n.toFixed(0)}`;

/** 100 → "1%", 35 → "0.35%" */
export const fmtBps = (bps: number) => `${(bps / 100).toFixed(bps % 100 !== 0 ? 2 : 0)}%`;

export const shortAddr = (s: string, head = 4, tail = 4) => (s.length <= head + tail + 1 ? s : `${s.slice(0, head)}…${s.slice(-tail)}`);

export const timeAgo = (t: number) => {
  const s = Math.floor((Date.now() - t) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
};

/** FNV-1a seeded mulberry32: the same seed always yields the same addresses. */
function rng(seed: string) {
  let h = 0x811c9dc5;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 0x1000193);
  }
  return () => {
    let t = (h += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), 1 | t);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 0x100000000;
  };
}

const B58 = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
const HEX = "0123456789abcdef";

const randomString = (r: () => number, alphabet: string, length: number) =>
  Array.from({ length }, () => alphabet[Math.floor(r() * alphabet.length)]).join("");

/** A base58 mint on Solana, a 0x contract elsewhere. */
export function mintAddress(chain: ChainId, seed: string) {
  const r = rng(chain + seed);
  return chain === "solana" ? randomString(r, B58, 44) : `0x${randomString(r, HEX, 40)}`;
}

export function txHash(chain: ChainId, seed: string) {
  const r = rng(`tx${chain}${seed}`);
  return chain === "solana" ? randomString(r, B58, 64) : `0x${randomString(r, HEX, 64)}`;
}
