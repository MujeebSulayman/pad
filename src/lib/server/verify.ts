import "server-only";
import { createPublicClient, http, isAddressEqual, type Address, type Hash } from "viem";
import type { ChainId } from "../data";
import { RPC_URL } from "../env";
import { VIEM_CHAIN } from "../evm-chains";
import { HttpError } from "./env";

/**
 * Confirms on-chain that a launch happened as the client claims: the transaction succeeded, it was
 * signed by `creator`, and it touched `mint`. The feed only ever shows verified deployments.
 */
export async function verifyLaunchTx(chain: ChainId, txHash: string, creator: string, mint: string) {
  const ok = chain === "solana" ? await verifySolana(txHash, creator, mint) : await verifyEvm(chain, txHash as Hash, creator as Address, mint as Address);
  if (!ok) throw new HttpError(400, "The transaction does not match this launch (wrong signer, token or status).");
}

async function solanaRpc<T>(method: string, params: unknown[]): Promise<T> {
  const res = await fetch(RPC_URL.solana, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  const body = await res.json();
  if (body.error) throw new HttpError(502, `Solana RPC: ${body.error.message}`);
  return body.result as T;
}

type SolanaTx = {
  meta: { err: unknown; postTokenBalances?: { mint: string }[] } | null;
  transaction: { message: { accountKeys: { pubkey: string; signer: boolean }[] } };
};

async function verifySolana(signature: string, creator: string, mint: string) {
  // A just-confirmed transaction can take a moment to be served by getTransaction.
  for (let i = 0; i < 6; i++) {
    const tx = await solanaRpc<SolanaTx | null>("getTransaction", [
      signature,
      { encoding: "jsonParsed", commitment: "confirmed", maxSupportedTransactionVersion: 0 },
    ]);
    if (tx) {
      if (!tx.meta || tx.meta.err) return false;
      const keys = tx.transaction.message.accountKeys;
      const signed = keys.some((k) => k.signer && k.pubkey === creator);
      const touched = keys.some((k) => k.pubkey === mint) || !!tx.meta.postTokenBalances?.some((b) => b.mint === mint);
      return signed && touched;
    }
    await new Promise((r) => setTimeout(r, 1500));
  }
  throw new HttpError(409, "Transaction not found yet. Try again in a few seconds.");
}

async function verifyEvm(chain: Exclude<ChainId, "solana">, hash: Hash, creator: Address, mint: Address) {
  if (!RPC_URL[chain]) throw new HttpError(503, `No RPC configured for ${chain}.`);
  const client = createPublicClient({ chain: VIEM_CHAIN[chain], transport: http(RPC_URL[chain]) });
  const receipt = await client.waitForTransactionReceipt({ hash, timeout: 30_000 }).catch(() => null);
  if (!receipt) throw new HttpError(409, "Transaction not found yet. Try again in a few seconds.");
  if (receipt.status !== "success" || !isAddressEqual(receipt.from, creator)) return false;
  return (!!receipt.contractAddress && isAddressEqual(receipt.contractAddress, mint)) || receipt.logs.some((l) => isAddressEqual(l.address, mint));
}
