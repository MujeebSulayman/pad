import { createPublicClient, formatEther, http, isAddressEqual, parseAbi, parseUnits, zeroAddress, type Address, type Hex, type PublicClient } from "viem";
import { MIRROR_TOKEN_ABI, MIRROR_TOKEN_BYTECODE } from "../contracts/mirror-token";
import type { ChainId } from "../data";
import { RPC_URL } from "../env";
import { VIEM_CHAIN } from "../evm-chains";
import { gasFor, requireFunds } from "./funds";
import { evmSigner, xUrl, type Adapter, type LegCtx, type StepDef } from "./types";

type EvmChain = Exclude<ChainId, "solana">;

const publicClient = (chain: EvmChain) => createPublicClient({ chain: VIEM_CHAIN[chain], transport: http(RPC_URL[chain]) }) as PublicClient;

const SIGN: StepDef = { id: "sign", label: "Sign & send", detail: "Approve in your wallet (gas is estimated first, so a revert stops here)" };
const confirmStep = (c: { shortName: string }): StepDef => ({ id: "confirm", label: "Confirm", detail: `Waiting for ${c.shortName} to include it` });

async function waitFor(chain: EvmChain, hash: Hex) {
  const receipt = await publicClient(chain).waitForTransactionReceipt({ hash, timeout: 120_000 });
  if (receipt.status !== "success") throw new Error("Transaction reverted on-chain.");
  return receipt;
}

/** Zora content coin (ETH-paired, Uniswap v4). Zora's API builds the factory call. */
export const zora: Adapter = {
  steps: (c) => [{ id: "build", label: "Request coin calldata", detail: "Zora API · factory on Base" }, SIGN, confirmStep(c)],
  run: async (ctx) => {
    const evm = evmSigner(ctx);
    ctx.step("build");
    await requireFunds(ctx, evm.address);
    const call = await ctx.call<{ to: Address; data: Hex; coin: Address }>("/api/venues/zora", {
      creator: evm.address,
      name: ctx.draft.name,
      symbol: ctx.draft.symbol,
      uri: ctx.meta.metadataUri,
    });
    ctx.step("sign");
    const wallet = await evm.walletClient("base");
    const tx = await wallet.sendTransaction({ account: evm.address, chain: VIEM_CHAIN.base, to: call.to, data: call.data, value: 0n });
    ctx.step("confirm");
    const receipt = await waitFor("base", tx);
    if (!receipt.logs.some((l) => isAddressEqual(l.address, call.coin))) throw new Error("Zora coin was not created at the predicted address.");
    return { status: "success", creator: evm.address, mint: call.coin, tx };
  },
};

/** Clanker v4 on Base: single-sided Uniswap v4 LP, creator takes the reward stream. */
export const clanker: Adapter = {
  steps: (c) => [SIGN, confirmStep(c)],
  run: async (ctx) => {
    const evm = evmSigner(ctx);
    const d = ctx.draft;
    ctx.step("sign");
    await requireFunds(ctx, evm.address);
    const { Clanker } = await import("clanker-sdk/v4");
    const sdk = new Clanker({ wallet: (await evm.walletClient("base")) as never, publicClient: publicClient("base") as never });
    const socials = [d.twitter && { platform: "x", url: xUrl(d.twitter) }, d.website && { platform: "website", url: d.website }].filter(Boolean) as {
      platform: string;
      url: string;
    }[];
    const devBuy = Number(d.devBuy) || 0;
    const res = await sdk.deploy({
      name: d.name,
      symbol: d.symbol,
      image: ctx.meta.imageUri,
      chainId: 8453,
      tokenAdmin: evm.address,
      metadata: { description: d.description, socialMediaUrls: socials },
      context: { interface: "MirrorPad" },
      ...(devBuy > 0 && { devBuy: { ethAmount: devBuy } }),
    });
    if (res.error) throw res.error;
    ctx.step("confirm");
    const done = await res.waitForTransaction();
    if (done.error) throw done.error;
    return { status: "success", creator: evm.address, mint: done.address, tx: res.txHash };
  },
};

/** Flaunch on Base: Uniswap v4 with a creator fee allocation, no fair-launch window. */
export const flaunch: Adapter = {
  steps: (c) => [SIGN, confirmStep(c)],
  run: async (ctx) => {
    const evm = evmSigner(ctx);
    const d = ctx.draft;
    ctx.step("sign");
    await requireFunds(ctx, evm.address);
    const { createFlaunch } = await import("@flaunch/sdk");
    const sdk = createFlaunch({ publicClient: publicClient("base") as never, walletClient: (await evm.walletClient("base")) as never });
    const tx = await sdk.flaunch({
      name: d.name,
      symbol: d.symbol,
      tokenUri: ctx.meta.metadataUri,
      fairLaunchPercent: 0,
      fairLaunchDuration: 0,
      initialMarketCapUSD: 10_000,
      creator: evm.address,
      creatorFeeAllocationPercent: Math.min(100, Math.max(0, (Number(d.creatorFeeBps) || 0) / 100)),
    });
    ctx.step("confirm");
    await waitFor("base", tx);
    const pool = await sdk.getPoolCreatedFromTx(tx);
    if (!pool) throw new Error("Flaunch pool was not created.");
    return { status: "success", creator: evm.address, mint: pool.memecoin, tx };
  },
};

const TRANSFER = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";
const TM2_ABI = parseAbi(["function createToken(bytes args, bytes signature) payable"]);

/** Four.meme on BSC: sign in with the wallet, four.meme signs the create args, the user sends them. */
export const fourmeme: Adapter = {
  steps: (c) => [
    { id: "login", label: "Sign in to Four.meme", detail: "Sign a login message (no gas)" },
    { id: "build", label: "Create token on Four.meme", detail: "Uploads the image and gets signed create args" },
    SIGN,
    confirmStep(c),
  ],
  run: async (ctx) => {
    const evm = evmSigner(ctx);
    const d = ctx.draft;
    ctx.step("login");
    await requireFunds(ctx, evm.address);
    const { message } = await ctx.call<{ message: string }>("/api/venues/fourmeme", { step: "nonce", address: evm.address });
    await evm.walletClient("bsc");
    const signature = await evm.signMessage(message);
    ctx.step("build");
    const created = await ctx.call<{ createArg: Hex; signature: Hex; value: string; tokenManager: Address }>("/api/venues/fourmeme", {
      step: "create",
      address: evm.address,
      signature,
      name: d.name,
      symbol: d.symbol,
      description: d.description,
      image: ctx.meta.imageUri,
      website: d.website,
      twitter: xUrl(d.twitter),
      telegram: d.telegram,
      devBuy: Number(d.devBuy) || 0,
    });
    ctx.step("sign");
    await requireFunds(ctx, evm.address, Number(formatEther(BigInt(created.value))) + gasFor("bsc"));
    const wallet = await evm.walletClient("bsc");
    const tx = await wallet.writeContract({
      account: evm.address,
      chain: VIEM_CHAIN.bsc,
      address: created.tokenManager,
      abi: TM2_ABI,
      functionName: "createToken",
      args: [created.createArg, created.signature],
      value: BigInt(created.value),
    });
    ctx.step("confirm");
    const receipt = await waitFor("bsc", tx);
    // The new token's genesis mint: a Transfer from the zero address, emitted by the token itself.
    const mintLog = receipt.logs.find((l) => l.topics[0] === TRANSFER && l.topics[1] && BigInt(l.topics[1]) === 0n && !isAddressEqual(l.address, created.tokenManager));
    if (!mintLog) throw new Error("Could not find the new token in the transaction.");
    return { status: "success", creator: evm.address, mint: mintLog.address, tx };
  },
};

/** Deploys MirrorToken (fixed-supply ERC-20, whole supply to the creator) straight from the wallet. */
function erc20(chain: EvmChain, next?: (token: Address) => { label: string; href: string }): Adapter {
  return {
    steps: (c) => [{ id: "sign", label: "Deploy ERC-20", detail: "Fixed supply minted to your wallet · approve in wallet" }, confirmStep(c)],
    run: async (ctx: LegCtx) => {
      const evm = evmSigner(ctx);
      const d = ctx.draft;
      if (!RPC_URL[chain]) throw new Error(`No RPC is configured for ${VIEM_CHAIN[chain].name}.`);
      const decimals = Number(d.decimals || 18);
      if (!Number.isInteger(decimals) || decimals > 18) throw new Error("Decimals must be a whole number from 0 to 18.");
      const supply = parseUnits(d.supply || "1000000000", decimals);
      ctx.step("sign");
      await requireFunds(ctx, evm.address);
      const wallet = await evm.walletClient(chain);
      const tx = await wallet.deployContract({
        account: evm.address,
        chain: VIEM_CHAIN[chain],
        abi: MIRROR_TOKEN_ABI,
        bytecode: MIRROR_TOKEN_BYTECODE,
        args: [d.name, d.symbol, decimals, supply, evm.address, ctx.meta.metadataUri],
      });
      ctx.step("confirm");
      const receipt = await waitFor(chain, tx);
      const token = receipt.contractAddress;
      if (!token || isAddressEqual(token, zeroAddress)) throw new Error("Deployment did not create a contract.");
      // Issuer fields the venue asks for are already in the pinned metadata; also keep them on the feed row.
      const details = Object.fromEntries((["issuerEntity", "jurisdiction"] as const).filter((f) => ctx.pad.fields.includes(f) && d[f].trim()).map((f) => [f, d[f].trim()]));
      return { status: "success", creator: evm.address, mint: token, tx, details, next: next?.(token) };
    },
  };
}

export const robinhoodMint = erc20("robinhood");
export const robinhoodIssuance = erc20("robinhood");
export const bscIssuance = erc20("bsc", (token) => ({ label: "Seed a PancakeSwap pool", href: `https://pancakeswap.finance/add/BNB/${token}?chain=bsc` }));
export const pancakeswap = erc20("bsc", (token) => ({ label: "Seed a PancakeSwap pool", href: `https://pancakeswap.finance/add/BNB/${token}?chain=bsc` }));
