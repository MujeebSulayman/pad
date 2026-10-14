import {
  generateKeyPairSigner,
  getBase58Encoder,
  getBase64Decoder,
  getBase64Encoder,
  getSignatureFromTransaction,
  getTransactionDecoder,
  getTransactionEncoder,
  partiallySignTransaction,
  type KeyPairSigner,
} from "@solana/kit";
import { RPC_URL } from "./env";

export const fromBase64 = (s: string) => new Uint8Array(getBase64Encoder().encode(s));
export const toBase64 = (b: Uint8Array) => getBase64Decoder().decode(b);
export const fromBase58 = (s: string) => new Uint8Array(getBase58Encoder().encode(s));

const decode = (bytes: Uint8Array) => getTransactionDecoder().decode(bytes);
const encode = (tx: ReturnType<typeof decode>) => new Uint8Array(getTransactionEncoder().encode(tx));

/** A fresh keypair for a new mint account. */
export const newMintSigner = (): Promise<KeyPairSigner> => generateKeyPairSigner();

/** Adds the mint keypair's signature to a serialized transaction. */
export async function signWithMint(bytes: Uint8Array, mint: KeyPairSigner) {
  return encode(await partiallySignTransaction([mint.keyPair], decode(bytes)));
}

/** The transaction id: the fee payer's signature, base58. */
export const txSignature = (bytes: Uint8Array) => getSignatureFromTransaction(decode(bytes)) as string;

async function rpc<T>(method: string, params: unknown[]): Promise<T> {
  const res = await fetch(RPC_URL.solana, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  const body = await res.json();
  if (body.error) {
    const logs: string[] | undefined = body.error.data?.logs;
    const hint = logs?.findLast((l) => /error|failed|insufficient/i.test(l));
    throw new Error(hint ? `${body.error.message} — ${hint}` : body.error.message);
  }
  return body.result as T;
}

type Status = { err: unknown; confirmationStatus?: "processed" | "confirmed" | "finalized" } | null;

/** A recent blockhash, for transactions we build ourselves. */
export async function latestBlockhash() {
  const { value } = await rpc<{ value: { blockhash: string; lastValidBlockHeight: number } }>("getLatestBlockhash", [{ commitment: "confirmed" }]);
  return { blockhash: value.blockhash, lastValidBlockHeight: BigInt(value.lastValidBlockHeight) };
}

/** Lamports held by `address`. */
export async function lamportsOf(address: string): Promise<bigint> {
  const { value } = await rpc<{ value: number }>("getBalance", [address, { commitment: "confirmed" }]);
  return BigInt(value);
}

/**
 * Broadcasts a fully signed transaction (with preflight simulation) and waits for confirmation,
 * re-sending every few seconds until it lands or ~90 s pass. Returns the signature.
 */
export async function sendAndConfirm(bytes: Uint8Array): Promise<string> {
  const wire = toBase64(bytes);
  const send = (skipPreflight: boolean) => rpc<string>("sendTransaction", [wire, { encoding: "base64", skipPreflight, preflightCommitment: "confirmed", maxRetries: 0 }]);
  await send(false);
  return confirmSignature(txSignature(bytes), () => send(true));
}

/** Polls until `signature` is confirmed, calling `resend` every few seconds if given. */
export async function confirmSignature(signature: string, resend?: () => Promise<unknown>): Promise<string> {
  const deadline = Date.now() + 90_000;
  for (let i = 1; Date.now() < deadline; i++) {
    await new Promise((r) => setTimeout(r, 1500));
    const { value } = await rpc<{ value: Status[] }>("getSignatureStatuses", [[signature]]);
    const s = value[0];
    if (s?.err) throw new Error(`Transaction failed on-chain: ${JSON.stringify(s.err)}`);
    if (s?.confirmationStatus === "confirmed" || s?.confirmationStatus === "finalized") return signature;
    if (resend && i % 3 === 0) await resend().catch(() => {});
  }
  throw new Error(`Transaction ${signature.slice(0, 8)}… was not confirmed in time. Check it on Solscan before retrying.`);
}
