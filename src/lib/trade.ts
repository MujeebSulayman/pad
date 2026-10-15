import {
  AccountRole,
  address,
  appendTransactionMessageInstructions,
  compileTransaction,
  compressTransactionMessageUsingAddressLookupTables,
  createNoopSigner,
  createTransactionMessage,
  getBase58Decoder,
  getBase64Encoder,
  getTransactionEncoder,
  pipe,
  setTransactionMessageFeePayer,
  setTransactionMessageLifetimeUsingBlockhash,
  type Address,
  type AddressesByLookupTableAddress,
  type Blockhash,
  type Instruction,
} from "@solana/kit";
import { getTransferSolInstruction } from "@solana-program/system";
import { createPublicClient, erc20Abi, http, maxUint256, type Address as EvmAddress, type Hex } from "viem";
import type { Signer } from "@/components/wallet/context";
import { api } from "./api";
import type { ChainId } from "./data";
import { RPC_URL } from "./env";
import { VIEM_CHAIN } from "./evm-chains";
import { feeOf, TREASURY } from "./fees";
import { payableFee, sendAndConfirm, toBase64 } from "./solana";

export type Side = "buy" | "sell";
type EvmChain = Exclude<ChainId, "solana">;

export const SOL_MINT = "So11111111111111111111111111111111111111112";
export const NATIVE_EVM = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE";

/* ── Balances ──────────────────────────────────────────────────────────── */

async function solRpc<T>(method: string, params: unknown[]): Promise<T> {
  const res = await fetch(RPC_URL.solana, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }) });
  const body = await res.json();
  if (body.error) throw new Error(body.error.message);
  return body.result as T;
}

const evmClient = (chain: EvmChain) => createPublicClient({ chain: VIEM_CHAIN[chain], transport: http(RPC_URL[chain]) });

/** The user's balance of `token` (raw units) and the token's decimals. */
export async function tokenBalance(chain: ChainId, owner: string, token: string): Promise<{ raw: bigint; decimals: number }> {
  if (chain === "solana") {
    const [{ value: accounts }, mint] = await Promise.all([
      solRpc<{ value: { account: { data: { parsed: { info: { tokenAmount: { amount: string } } } } } }[] }>("getTokenAccountsByOwner", [
        owner,
        { mint: token },
        { encoding: "jsonParsed", commitment: "confirmed" },
      ]),
      solRpc<{ value: { data: { parsed: { info: { decimals: number } } } } | null }>("getAccountInfo", [token, { encoding: "jsonParsed" }]),
    ]);
    const raw = accounts.reduce((s, a) => s + BigInt(a.account.data.parsed.info.tokenAmount.amount), 0n);
    return { raw, decimals: mint.value?.data.parsed.info.decimals ?? 6 };
  }
  const client = evmClient(chain);
  const [raw, decimals] = await Promise.all([
    client.readContract({ address: token as EvmAddress, abi: erc20Abi, functionName: "balanceOf", args: [owner as EvmAddress] }),
    client.readContract({ address: token as EvmAddress, abi: erc20Abi, functionName: "decimals" }),
  ]);
  return { raw, decimals };
}

/* ── Quotes ────────────────────────────────────────────────────────────── */

type ApiIx = { programId: string; accounts: { pubkey: string; isSigner: boolean; isWritable: boolean }[]; data: string };
type Build = {
  inAmount: string;
  outAmount: string;
  otherAmountThreshold: string;
  computeBudgetInstructions: ApiIx[];
  setupInstructions: ApiIx[];
  swapInstruction: ApiIx;
  cleanupInstruction: ApiIx | null;
  otherInstructions: ApiIx[];
  addressesByLookupTableAddress: Record<string, string[]> | null;
  blockhashWithMetadata: { blockhash: number[]; lastValidBlockHeight: number };
};
type ZeroXQuote = {
  buyAmount: string;
  minBuyAmount: string;
  sellAmount: string;
  issues?: { allowance: { actual: string; spender: EvmAddress } | null };
  transaction: { to: EvmAddress; data: Hex; value: string; gas?: string };
};

/** What the user sees before confirming. Amounts are raw units of what they spend / receive. */
export type Quote = {
  side: Side;
  spend: bigint;
  /** Expected, and the worst case after slippage. */
  receive: bigint;
  receiveMin: bigint;
  /** MirrorPad's fee, in the native coin (lamports / wei). */
  fee: bigint;
  /** Opaque data needed to execute. */
  plan: { kind: "solana"; build: Build; fee: bigint } | { kind: "evm"; quote: ZeroXQuote };
};

type Ctx = { signer: Signer; token: { chain: ChainId; address: string } };

/**
 * Solana: buys spend `amount` lamports of which 2% is MirrorPad's fee and 98% is swapped; sells swap
 * `amount` token units and the fee is 2% of the minimum SOL out. EVM: 0x takes the 2% in the native coin.
 */
export async function getQuote({ signer, token }: Ctx, side: Side, amount: bigint): Promise<Quote> {
  const call = async <T,>(path: string, body: unknown) => api<T>(path, { body, token: await signer.getAccessToken() });

  if (token.chain === "solana") {
    const taker = signer.solana?.address;
    if (!taker) throw new Error("No Solana wallet connected.");
    const treasury = TREASURY.solana;
    const buyFee = side === "buy" && treasury ? feeOf(amount) : 0n;
    const build = await call<Build>("/api/trade/solana", {
      inputMint: side === "buy" ? SOL_MINT : token.address,
      outputMint: side === "buy" ? token.address : SOL_MINT,
      amount: String(amount - buyFee),
      taker,
    });
    const out = BigInt(build.outAmount);
    const min = BigInt(build.otherAmountThreshold);
    const sellFee = side === "sell" && treasury ? feeOf(min) : 0n;
    const fee = buyFee + sellFee;
    return { side, spend: amount, receive: side === "sell" ? out - sellFee : out, receiveMin: side === "sell" ? min - sellFee : min, fee, plan: { kind: "solana", build, fee } };
  }

  const taker = signer.evm?.address;
  if (!taker) throw new Error("No EVM wallet connected.");
  const quote = await call<ZeroXQuote>("/api/trade/evm", {
    chain: token.chain,
    sellToken: side === "buy" ? NATIVE_EVM : token.address,
    buyToken: side === "buy" ? token.address : NATIVE_EVM,
    sellAmount: String(amount),
    taker,
  });
  // 0x reports the fee inside its amounts; for display: 2% of the native leg.
  const nativeLeg = side === "buy" ? amount : BigInt(quote.buyAmount);
  return {
    side,
    spend: amount,
    receive: BigInt(quote.buyAmount),
    receiveMin: BigInt(quote.minBuyAmount),
    fee: TREASURY.evm ? feeOf(nativeLeg) : 0n,
    plan: { kind: "evm", quote },
  };
}

/* ── Execution ─────────────────────────────────────────────────────────── */

const COMPUTE_BUDGET = address("ComputeBudget111111111111111111111111111111");
const CU_MAX = 1_400_000;

const toIx = (ix: ApiIx): Instruction => ({
  programAddress: address(ix.programId),
  accounts: ix.accounts.map((a) => ({
    address: address(a.pubkey),
    role: a.isSigner && a.isWritable ? AccountRole.WRITABLE_SIGNER : a.isSigner ? AccountRole.READONLY_SIGNER : a.isWritable ? AccountRole.WRITABLE : AccountRole.READONLY,
  })),
  data: new Uint8Array(getBase64Encoder().encode(ix.data)),
});

function cuLimitIx(units: number): Instruction {
  const data = new Uint8Array(5);
  data[0] = 2;
  new DataView(data.buffer).setUint32(1, units, true);
  return { programAddress: COMPUTE_BUDGET, accounts: [], data };
}

/** Swap + MirrorPad's fee transfer in one transaction, sized by a simulation, signed once. */
async function executeSolana(signer: Signer, build: Build, quotedFee: bigint): Promise<string> {
  const sol = signer.solana!;
  const fee = TREASURY.solana ? await payableFee(TREASURY.solana, quotedFee) : 0n;
  const taker = createNoopSigner(address(sol.address));
  const body: Instruction[] = [
    ...build.setupInstructions.map(toIx),
    toIx(build.swapInstruction),
    ...(build.cleanupInstruction ? [toIx(build.cleanupInstruction)] : []),
    ...build.otherInstructions.map(toIx),
    // After cleanup, so on a sell the fee is paid from the SOL the swap just unwrapped.
    ...(fee > 0n && TREASURY.solana ? [getTransferSolInstruction({ source: taker, destination: address(TREASURY.solana), amount: fee })] : []),
  ];
  const alts: AddressesByLookupTableAddress = Object.fromEntries(
    Object.entries(build.addressesByLookupTableAddress ?? {}).map(([k, v]) => [address(k), v.map((a) => address(a))]),
  ) as Record<Address, Address[]>;
  const lifetime = {
    blockhash: getBase58Decoder().decode(Uint8Array.from(build.blockhashWithMetadata.blockhash)) as Blockhash,
    lastValidBlockHeight: BigInt(build.blockhashWithMetadata.lastValidBlockHeight),
  };
  const compile = (ixs: Instruction[]) =>
    new Uint8Array(
      getTransactionEncoder().encode(
        compileTransaction(
          pipe(
            createTransactionMessage({ version: 0 }),
            (m) => appendTransactionMessageInstructions(ixs, m),
            (m) => compressTransactionMessageUsingAddressLookupTables(m, alts),
            (m) => setTransactionMessageFeePayer(taker.address, m),
            (m) => setTransactionMessageLifetimeUsingBlockhash(lifetime, m),
          ),
        ),
      ),
    );

  // Simulate at the max limit to size compute, and to stop here with a readable error if it would fail.
  const sim = await solRpc<{ value: { err: unknown; unitsConsumed?: number; logs?: string[] } }>("simulateTransaction", [
    toBase64(compile([cuLimitIx(CU_MAX), ...body])),
    { encoding: "base64", sigVerify: false, replaceRecentBlockhash: true, commitment: "confirmed" },
  ]);
  if (sim.value.err) {
    const hint = (sim.value.logs ?? []).filter((l) => /insufficient|slippage|exceeds|error/i.test(l)).slice(-1)[0];
    throw new Error(`The trade would fail: ${hint ?? JSON.stringify(sim.value.err)}`);
  }
  const units = Math.min(Math.ceil((sim.value.unitsConsumed ?? CU_MAX) * 1.2), CU_MAX);
  const tx = compile([cuLimitIx(units), ...build.computeBudgetInstructions.map(toIx), ...body]);
  return sendAndConfirm(await sol.signTransaction(tx));
}

/** Approves 0x's AllowanceHolder for sells when needed, then sends the swap. */
async function executeEvm(signer: Signer, chain: EvmChain, token: string, quote: ZeroXQuote): Promise<string> {
  const evm = signer.evm!;
  const wallet = await evm.walletClient(chain);
  const client = evmClient(chain);
  const allowance = quote.issues?.allowance;
  if (allowance && BigInt(allowance.actual) < BigInt(quote.sellAmount)) {
    const approve = await wallet.writeContract({
      account: evm.address,
      chain: VIEM_CHAIN[chain],
      address: token as EvmAddress,
      abi: erc20Abi,
      functionName: "approve",
      args: [allowance.spender, maxUint256],
    });
    await client.waitForTransactionReceipt({ hash: approve, timeout: 120_000 });
  }
  const t = quote.transaction;
  const hash = await wallet.sendTransaction({
    account: evm.address,
    chain: VIEM_CHAIN[chain],
    to: t.to,
    data: t.data,
    value: BigInt(t.value),
    ...(t.gas && { gas: BigInt(t.gas) }),
  });
  const receipt = await client.waitForTransactionReceipt({ hash, timeout: 120_000 });
  if (receipt.status !== "success") throw new Error("The trade reverted on-chain (price moved past your slippage).");
  return hash;
}

export async function executeQuote({ signer, token }: Ctx, quote: Quote): Promise<string> {
  if (quote.plan.kind === "solana") return executeSolana(signer, quote.plan.build, quote.plan.fee);
  return executeEvm(signer, token.chain as EvmChain, token.address, quote.plan.quote);
}

/** The native coin's decimals per chain. */
export const nativeDecimals = (chain: ChainId) => (chain === "solana" ? 9 : 18);
