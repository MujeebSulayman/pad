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
import { lamportsOf, latestBlockhash, sendAndConfirm } from "./solana";

type EvmChain = Exclude<ChainId, "solana">;

/** Solana's flat fee for a one-signature transfer. */
const SOL_FEE = 5000n;
/** A system account holding less than this (but more than 0) is rejected by the runtime. */
const SOL_RENT_MIN = 890_880n;

const evmClient = (chain: EvmChain) => createPublicClient({ chain: VIEM_CHAIN[chain], transport: http(RPC_URL[chain]) });

export const isValidRecipient = (chain: ChainId, to: string) => (chain === "solana" ? isSolAddress(to) : isEvmAddress(to));

/** The most that can be sent from `from` on `chain`, after the network fee, as a decimal string. */
export async function maxSendable(chain: ChainId, from: string): Promise<string> {
  if (chain === "solana") {
    const bal = await lamportsOf(from);
    return formatUnits(bal > SOL_FEE ? bal - SOL_FEE : 0n, 9);
  }
  const client = evmClient(chain);
  const [bal, fees] = await Promise.all([client.getBalance({ address: from as Address }), client.estimateFeesPerGas()]);
  // A plain transfer is 21,000 gas; keep 50% headroom on the fee so the send doesn't fail on a fee bump.
  const fee = (21_000n * (fees.maxFeePerGas ?? fees.gasPrice ?? 0n) * 3n) / 2n;
  return formatEther(bal > fee ? bal - fee : 0n);
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
    const bal = await lamportsOf(sol.address);
    const left = bal - amt - SOL_FEE;
    if (left < 0n) throw new Error(`Not enough SOL: you have ${formatUnits(bal, 9)} SOL including the network fee.`);
    if (left > 0n && left < SOL_RENT_MIN) {
      throw new Error(`Solana won't leave ${formatUnits(left, 9)} SOL behind. Send everything (Max) or leave at least ${formatUnits(SOL_RENT_MIN, 9)} SOL.`);
    }
    const from = createNoopSigner(solAddress(sol.address));
    const { blockhash, lastValidBlockHeight } = await latestBlockhash();
    const message = pipe(
      createTransactionMessage({ version: 0 }),
      (m) => setTransactionMessageFeePayer(from.address, m),
      (m) => setTransactionMessageLifetimeUsingBlockhash({ blockhash: blockhash as Blockhash, lastValidBlockHeight }, m),
      (m) => appendTransactionMessageInstruction(getTransferSolInstruction({ source: from, destination: solAddress(to), amount: lamports(amt) }), m),
    );
    const unsigned = new Uint8Array(getTransactionEncoder().encode(compileTransaction(message)));
    return sendAndConfirm(await sol.signTransaction(unsigned));
  }

  const evm = signer.evm;
  if (!evm) throw new Error("No EVM wallet connected.");
  if (to.toLowerCase() === evm.address.toLowerCase()) throw new Error("That's this wallet's own address.");
  const wallet = await evm.walletClient(chain);
  const hash = await wallet.sendTransaction({ account: evm.address, chain: VIEM_CHAIN[chain], to: to as Address, value: parseEther(amount) });
  const receipt = await evmClient(chain).waitForTransactionReceipt({ hash, timeout: 120_000 });
  if (receipt.status !== "success") throw new Error("The transfer reverted.");
  return hash;
}
