import {
  address as solAddress,
  appendTransactionMessageInstruction,
  compileTransaction,
  createNoopSigner,
  createTransactionMessage,
  getTransactionEncoder,
  isAddress as isSolAddress,
  lamports,
  pipe,
  setTransactionMessageFeePayer,
  setTransactionMessageLifetimeUsingBlockhash,
  type Blockhash,
} from "@solana/kit";
import { getTransferSolInstruction } from "@solana-program/system";
import { createPublicClient, formatEther, formatUnits, http, isAddress as isEvmAddress, parseEther, parseUnits, type Address } from "viem";
import type { Signer } from "@/components/wallet/context";
import type { ChainId } from "./data";
import { RPC_URL } from "./env";
import { VIEM_CHAIN } from "./evm-chains";
import { feeOf, FEE_BPS, TREASURY } from "./fees";
import { lamportsOf, latestBlockhash, payableFee, RENT_EXEMPT_MIN, sendAndConfirm } from "./solana";

type EvmChain = Exclude<ChainId, "solana">;

/** Solana's flat fee for a one-signature transfer. */
const SOL_FEE = 5000n;

const evmClient = (chain: EvmChain) => createPublicClient({ chain: VIEM_CHAIN[chain], transport: http(RPC_URL[chain]) });

/** MirrorPad's withdrawal fee on `amount` (raw units), or 0 when no treasury is set for that side. */
export const withdrawFee = (chain: ChainId, amount: bigint) => ((chain === "solana" ? TREASURY.solana : TREASURY.evm) ? feeOf(amount) : 0n);

/** Largest amount whose amount + 2% fee fits in `available`. */
const maxBeforeFee = (chain: ChainId, available: bigint) => (withdrawFee(chain, 10_000n) > 0n ? (available * 10_000n) / (10_000n + BigInt(FEE_BPS)) : available);

/**
 * EVM withdrawals take two transactions (fee, then transfer). A fee paid for a transfer that then
 * failed or was cancelled is credited to the next attempt from the same wallet within 30 minutes.
 */
const feeCredit = new Map<string, { paid: bigint; at: number }>();
const CREDIT_MS = 30 * 60_000;

export const isValidRecipient = (chain: ChainId, to: string) => (chain === "solana" ? isSolAddress(to) : isEvmAddress(to));

/** The most that can be sent from `from` on `chain`, after the network fee, as a decimal string. */
export async function maxSendable(chain: ChainId, from: string): Promise<string> {
  if (chain === "solana") {
    const bal = await lamportsOf(from);
    return formatUnits(maxBeforeFee(chain, bal > SOL_FEE ? bal - SOL_FEE : 0n), 9);
  }
  const client = evmClient(chain);
  const [bal, fees] = await Promise.all([client.getBalance({ address: from as Address }), client.estimateFeesPerGas()]);
  // A plain transfer is 21,000 gas (two of them with the MirrorPad fee); 50% headroom for fee bumps.
  const txs = withdrawFee(chain, 10_000n) > 0n ? 2n : 1n;
  const gas = (txs * 21_000n * (fees.maxFeePerGas ?? fees.gasPrice ?? 0n) * 3n) / 2n;
  return formatEther(maxBeforeFee(chain, bal > gas ? bal - gas : 0n));
}

/** Sends native SOL / ETH / BNB from the user's wallet. Resolves with the confirmed transaction id. */
export async function sendNative(signer: Signer, chain: ChainId, to: string, amount: string): Promise<string> {
  if (!isValidRecipient(chain, to)) throw new Error(`That isn't a valid ${chain === "solana" ? "Solana" : "EVM"} address.`);
  const value = Number(amount);
  if (!Number.isFinite(value) || value <= 0) throw new Error("Enter an amount above 0.");

  if (chain === "solana") {
    const sol = signer.solana;
    if (!sol) throw new Error("No Solana wallet connected.");
    if (to === sol.address) throw new Error("That's this wallet's own address.");
    const amt = parseUnits(amount, 9);
    if (amt < RENT_EXEMPT_MIN && (await lamportsOf(to).catch(() => 0n)) === 0n) {
      throw new Error(`That address is new on Solana, so it must receive at least ${formatUnits(RENT_EXEMPT_MIN, 9)} SOL.`);
    }
    const fee = TREASURY.solana ? await payableFee(TREASURY.solana, withdrawFee(chain, amt)) : 0n;
    const bal = await lamportsOf(sol.address);
    const left = bal - amt - fee - SOL_FEE;
    if (left < 0n) throw new Error(`Not enough SOL: you have ${formatUnits(bal, 9)} SOL, and this needs ${formatUnits(amt + fee + SOL_FEE, 9)} including fees.`);
    if (left > 0n && left < RENT_EXEMPT_MIN) {
      throw new Error(`Solana won't leave ${formatUnits(left, 9)} SOL behind. Send everything (Max) or leave at least ${formatUnits(RENT_EXEMPT_MIN, 9)} SOL.`);
    }
    const from = createNoopSigner(solAddress(sol.address));
    const { blockhash, lastValidBlockHeight } = await latestBlockhash();
    const message = pipe(
      createTransactionMessage({ version: 0 }),
      (m) => setTransactionMessageFeePayer(from.address, m),
      (m) => setTransactionMessageLifetimeUsingBlockhash({ blockhash: blockhash as Blockhash, lastValidBlockHeight }, m),
      (m) => appendTransactionMessageInstruction(getTransferSolInstruction({ source: from, destination: solAddress(to), amount: lamports(amt) }), m),
      // MirrorPad's fee rides in the same transaction: both transfers land, or neither does.
      (m) => (fee > 0n ? appendTransactionMessageInstruction(getTransferSolInstruction({ source: from, destination: solAddress(TREASURY.solana), amount: lamports(fee) }), m) : m),
    );
    const unsigned = new Uint8Array(getTransactionEncoder().encode(compileTransaction(message)));
    return sendAndConfirm(await sol.signTransaction(unsigned));
  }

  const evm = signer.evm;
  if (!evm) throw new Error("No EVM wallet connected.");
  if (to.toLowerCase() === evm.address.toLowerCase()) throw new Error("That's this wallet's own address.");
  const wallet = await evm.walletClient(chain);
  const client = evmClient(chain);
  const wei = parseEther(amount);
  const key = `${chain}:${evm.address.toLowerCase()}`;
  const credit = feeCredit.get(key);
  const credited = credit && Date.now() - credit.at < CREDIT_MS ? credit.paid : 0n;
  const owed = withdrawFee(chain, wei) - credited;

  if (owed > 0n) {
    const feeHash = await wallet.sendTransaction({ account: evm.address, chain: VIEM_CHAIN[chain], to: TREASURY.evm as Address, value: owed });
    const feeReceipt = await client.waitForTransactionReceipt({ hash: feeHash, timeout: 120_000 });
    if (feeReceipt.status !== "success") throw new Error("The fee payment reverted; nothing was withdrawn.");
    feeCredit.set(key, { paid: credited + owed, at: Date.now() });
  }
  const hash = await wallet.sendTransaction({ account: evm.address, chain: VIEM_CHAIN[chain], to: to as Address, value: wei });
  const receipt = await client.waitForTransactionReceipt({ hash, timeout: 120_000 });
  if (receipt.status !== "success") throw new Error("The transfer reverted. The fee you just paid is credited to your next try in the next 30 minutes.");
  feeCredit.delete(key);
  return hash;
}
