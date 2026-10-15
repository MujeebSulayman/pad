/*
 * The ShadowPad catalogue: four chains, ten launchpads, the per-venue form fields,
 * reference prices and the seeded activity feed. Every number here is an editable default,
 * not a live quote from the venue.
 */

export type ChainId = "robinhood" | "solana" | "base" | "bsc";
export type NativeToken = "ETH" | "SOL" | "BNB";

export type Chain = {
  id: ChainId;
  name: string;
  shortName: string;
  network: string;
  nativeToken: NativeToken;
  explorer: string;
  accent: string;
  mark: ChainId;
  avgBlockSec: number;
  note: string;
};

export type PadStatus = "live" | "beta";
export type Curve = "listing" | "fair-launch" | "bonding" | "auction";

export type FieldKey =
  | "name"
  | "symbol"
  | "description"
  | "image"
  | "supply"
  | "decimals"
  | "website"
  | "twitter"
  | "telegram"
  | "devBuy"
  | "creatorFeeBps"
  | "vestingMonths"
  | "issuerEntity"
  | "jurisdiction";

export type ExtraField = Exclude<FieldKey, "name" | "symbol" | "description" | "image">;

export type Launchpad = {
  id: string;
  name: string;
  chain: ChainId;
  tagline: string;
  description: string;
  status: PadStatus;
  url: string;
  tradeFeeBps: number;
  createFee: number;
  graduationUsd: number | null;
  curve: Curve;
  creatorRevBps: number;
  features: string[];
  fields: FieldKey[];
  liquidityDest: string;
};

export type Draft = {
  name: string;
  symbol: string;
  description: string;
  imageUrl: string;
  supply: string;
  decimals: string;
  website: string;
  twitter: string;
  telegram: string;
  devBuy: string;
  creatorFeeBps: string;
  vestingMonths: string;
  issuerEntity: string;
  jurisdiction: string;
};

export type DraftKey = keyof Draft;

/** Selected venue per mirror chain. The primary chain is never in here. */
export type Mirrors = Partial<Record<ChainId, string>>;

export type LaunchStatus = "success" | "pending" | "failed";

export type Launch = {
  id: string;
  launchpadId: string;
  chain: ChainId;
  name: string;
  symbol: string;
  imageUrl: string;
  createdAt: number;
  status: LaunchStatus;
  txHash: string;
  mintAddress: string;
  marketCapUsd: number;
  mirrorGroup?: string;
  mirrorCount?: number;
};

export const CHAINS: Chain[] = [
  {
    id: "robinhood",
    name: "Robinhood Chain",
    shortName: "Robinhood",
    network: "Arbitrum Orbit L2",
    nativeToken: "ETH",
    explorer: "https://explorer.robinhood.com",
    accent: "var(--c-green)",
    mark: "robinhood",
    avgBlockSec: 0.25,
    note: "Robinhood's Arbitrum Orbit L2. Tokens go live as soon as they're deployed.",
  },
  {
    id: "solana",
    name: "Solana",
    shortName: "Solana",
    network: "Mainnet Beta",
    nativeToken: "SOL",
    explorer: "https://solscan.io",
    accent: "var(--c-purple)",
    mark: "solana",
    avgBlockSec: 0.4,
    note: "Deepest memecoin liquidity. Sub-cent fees, instant bonding curves.",
  },
  {
    id: "base",
    name: "Base",
    shortName: "Base",
    network: "Base Mainnet",
    nativeToken: "ETH",
    explorer: "https://basescan.org",
    accent: "var(--c-blue)",
    mark: "base",
    avgBlockSec: 2,
    note: "Creator-coin and AI-agent ecosystem, native fee splits to the deployer.",
  },
  {
    id: "bsc",
    name: "BNB Smart Chain",
    shortName: "BSC",
    network: "BSC Mainnet",
    nativeToken: "BNB",
    explorer: "https://bscscan.com",
    accent: "var(--c-amber)",
    mark: "bsc",
    avgBlockSec: 0.75,
    note: "High retail throughput with a direct path to CEX surfacing.",
  },
];

export const CHAIN = Object.fromEntries(CHAINS.map((c) => [c.id, c])) as Record<ChainId, Chain>;

export const BASE_FIELDS: FieldKey[] = ["name", "symbol", "description", "image"];

export const LAUNCHPADS: Launchpad[] = [
  {
    id: "robinhood-listings",
    name: "Robinhood Issuance",
    chain: "robinhood",
    tagline: "Issuer-registered ERC-20 on Robinhood Chain",
    description:
      "Deploy a fixed-supply ERC-20 on Robinhood Chain with the issuing entity and jurisdiction recorded in its metadata. Live as soon as it confirms. Trading inside the Robinhood app is Robinhood's own decision and isn't part of this launch.",
    status: "live",
    url: "https://explorer.robinhood.com",
    tradeFeeBps: 0,
    createFee: 0,
    graduationUsd: null,
    curve: "fair-launch",
    creatorRevBps: 0,
    features: ["Issuer on record", "Jurisdiction on record", "Instant deploy", "Orbit L2 fees"],
    fields: [...BASE_FIELDS, "supply", "issuerEntity", "jurisdiction", "website"],
    liquidityDest: "Self-provisioned pool",
  },
  {
    id: "robinhood-chain-mint",
    name: "Robinhood Chain Mint",
    chain: "robinhood",
    tagline: "Direct ERC-20 deploy on Robinhood Chain",
    description:
      "Deploy a standard ERC-20 straight onto Robinhood Chain without a listing review. Trades on-chain only until an app listing is approved separately.",
    status: "beta",
    url: "https://robinhood.com",
    tradeFeeBps: 30,
    createFee: 0.0004,
    graduationUsd: null,
    curve: "fair-launch",
    creatorRevBps: 0,
    features: ["Instant deploy", "ERC-20 standard", "Orbit L2 fees", "No review gate"],
    fields: [...BASE_FIELDS, "supply", "decimals", "website", "twitter"],
    liquidityDest: "Self-provisioned pool",
  },
  {
    id: "pumpfun",
    name: "Pump.fun",
    chain: "solana",
    tagline: "The default Solana bonding curve",
    description:
      "Mint against a fixed bonding curve with no seed liquidity. Once the curve fills, the token and its liquidity migrate to a DEX pool and the LP is burned.",
    status: "live",
    url: "https://pump.fun",
    tradeFeeBps: 100,
    createFee: 0.02,
    graduationUsd: 69e3,
    curve: "bonding",
    creatorRevBps: 5,
    features: ["No seed liquidity", "Auto-migration", "Burned LP", "Livestream surface"],
    fields: [...BASE_FIELDS, "website", "twitter", "telegram", "devBuy"],
    liquidityDest: "PumpSwap",
  },
  {
    id: "bags",
    name: "Bags",
    chain: "solana",
    tagline: "Shared creator fee splits",
    description:
      "A curve launch where trading fees split between the deployer and a claimed social handle, so the person the token is about can earn without deploying it.",
    status: "live",
    url: "https://bags.fm",
    tradeFeeBps: 100,
    createFee: 0.02,
    graduationUsd: 69e3,
    curve: "bonding",
    creatorRevBps: 50,
    features: ["Fee splits", "Handle attribution", "Royalty claiming", "Curve launch"],
    fields: [...BASE_FIELDS, "twitter", "website", "telegram", "devBuy"],
    liquidityDest: "Meteora DBC",
  },
  {
    id: "zora",
    name: "Zora",
    chain: "base",
    tagline: "Every post is a coin",
    description:
      "Content-backed coins where each post mints an ERC-20 with an automatic Uniswap v4 position. Trading fees split between creator and referrer.",
    status: "live",
    url: "https://zora.co",
    tradeFeeBps: 100,
    createFee: 0,
    graduationUsd: null,
    curve: "fair-launch",
    creatorRevBps: 50,
    features: ["Uniswap v4 hook", "Creator earnings", "Referral splits", "Media native"],
    fields: [...BASE_FIELDS, "website", "twitter"],
    liquidityDest: "Uniswap v4",
  },
  {
    id: "clanker",
    name: "Clanker",
    chain: "base",
    tagline: "Deploy by mentioning a bot",
    description:
      "An agent-deployed ERC-20 factory. Tokens ship with a single-sided Uniswap v4 position and a fee stream claimable by the requesting account.",
    status: "live",
    url: "https://clanker.world",
    tradeFeeBps: 100,
    createFee: 0,
    graduationUsd: null,
    curve: "fair-launch",
    creatorRevBps: 40,
    features: ["Agent deploy", "Single-sided LP", "Fee claiming", "Vault + vesting"],
    fields: [...BASE_FIELDS, "website", "twitter", "devBuy"],
    liquidityDest: "Uniswap v4",
  },
  {
    id: "flaunch",
    name: "Flaunch",
    chain: "base",
    tagline: "Programmable fee routing",
    description:
      "Memecoins with a revenue manager attached: route a share of every trade to buybacks, a treasury, or a split of addresses, set at launch.",
    status: "live",
    url: "https://flaunch.gg",
    tradeFeeBps: 100,
    createFee: 0,
    graduationUsd: null,
    curve: "fair-launch",
    creatorRevBps: 100,
    features: ["Programmable fees", "Auto buyback", "Fair launch window", "Treasury routing"],
    fields: [...BASE_FIELDS, "creatorFeeBps", "website", "twitter"],
    liquidityDest: "Uniswap v4",
  },
  {
    id: "fourmeme",
    name: "Four.meme",
    chain: "bsc",
    tagline: "The BSC bonding curve standard",
    description:
      "The highest-volume fair-launch venue on BNB Chain. Curve fills in BNB and migrates into PancakeSwap with the LP locked.",
    status: "live",
    url: "https://four.meme",
    tradeFeeBps: 100,
    createFee: 0.005,
    graduationUsd: 24e3,
    curve: "bonding",
    creatorRevBps: 10,
    features: ["BNB-quoted curve", "Locked LP", "PancakeSwap migration", "Alpha pipeline"],
    fields: [...BASE_FIELDS, "website", "twitter", "telegram", "devBuy"],
    liquidityDest: "PancakeSwap v3",
  },
  {
    id: "pancakeswap",
    name: "PancakeSwap",
    chain: "bsc",
    tagline: "Direct pool + IFO",
    description:
      "Skip the curve: deploy the token, seed your own pool, and optionally run an initial farm offering to distribute supply against CAKE.",
    status: "live",
    url: "https://pancakeswap.finance",
    tradeFeeBps: 25,
    createFee: 0.003,
    graduationUsd: null,
    curve: "auction",
    creatorRevBps: 0,
    features: ["Self-seeded pool", "IFO distribution", "Farm incentives", "v3 concentrated LP"],
    fields: [...BASE_FIELDS, "supply", "decimals", "website", "telegram"],
    liquidityDest: "PancakeSwap v3",
  },
  {
    id: "binance-alpha",
    name: "BSC Issuance",
    chain: "bsc",
    tagline: "Issuer-registered ERC-20, Alpha-ready",
    description:
      "Deploy a fixed-supply token on BNB Chain with the issuing entity recorded in its metadata: the already-deployed token Binance Alpha asks for before you can apply. Live as soon as it confirms. Alpha selection is Binance's own decision.",
    status: "live",
    url: "https://bscscan.com",
    tradeFeeBps: 0,
    createFee: 0,
    graduationUsd: null,
    curve: "fair-launch",
    creatorRevBps: 0,
    features: ["Issuer on record", "Alpha-ready token", "Instant deploy", "Low BSC fees"],
    fields: [...BASE_FIELDS, "supply", "issuerEntity", "website", "twitter", "telegram"],
    liquidityDest: "Self-provisioned pool",
  },
];

export const PAD = Object.fromEntries(LAUNCHPADS.map((p) => [p.id, p])) as Record<string, Launchpad>;

export const padsOn = (chain: ChainId) => LAUNCHPADS.filter((p) => p.chain === chain);

export const STATUS_LABEL: Record<PadStatus, string> = {
  live: "Live",
  beta: "Beta",
};

export const FIELD_META: Record<ExtraField, { label: string; hint: string; placeholder: string }> = {
  supply: { label: "Total supply", hint: "Whole tokens minted at genesis.", placeholder: "1000000000" },
  decimals: { label: "Decimals", hint: "Token precision.", placeholder: "9" },
  website: { label: "Website", hint: "", placeholder: "https://" },
  twitter: { label: "X / Twitter", hint: "", placeholder: "@handle" },
  telegram: { label: "Telegram", hint: "", placeholder: "t.me/" },
  devBuy: { label: "Initial dev buy", hint: "Your own first purchase, in the chain's native asset.", placeholder: "0.5" },
  creatorFeeBps: { label: "Creator fee share", hint: "Basis points of trading fees routed to you.", placeholder: "50" },
  vestingMonths: { label: "Vesting", hint: "Linear unlock period for the creator allocation, in months.", placeholder: "6" },
  issuerEntity: { label: "Issuing entity", hint: "Legal name on the issuance filing.", placeholder: "Acme Labs Inc." },
  jurisdiction: { label: "Jurisdiction", hint: "Where the issuer is registered.", placeholder: "Delaware, US" },
};

/** Form field → draft key. Only `image` differs. */
export const DRAFT_KEY: Record<FieldKey, DraftKey> = {
  name: "name",
  symbol: "symbol",
  description: "description",
  image: "imageUrl",
  supply: "supply",
  decimals: "decimals",
  website: "website",
  twitter: "twitter",
  telegram: "telegram",
  devBuy: "devBuy",
  creatorFeeBps: "creatorFeeBps",
  vestingMonths: "vestingMonths",
  issuerEntity: "issuerEntity",
  jurisdiction: "jurisdiction",
};

export const NUMERIC_FIELDS: DraftKey[] = ["supply", "decimals", "devBuy", "creatorFeeBps", "vestingMonths"];

export const EMPTY_DRAFT: Draft = {
  name: "",
  symbol: "",
  description: "",
  imageUrl: "",
  supply: "1000000000",
  decimals: "9",
  website: "",
  twitter: "",
  telegram: "",
  devBuy: "0.5",
  creatorFeeBps: "50",
  vestingMonths: "6",
  issuerEntity: "",
  jurisdiction: "",
};

/** Reference USD prices for the cost estimate. */
export const PRICES: Record<NativeToken, number> = { SOL: 168, ETH: 3120, BNB: 612 };

export type SeedLaunch = Omit<Launch, "createdAt" | "txHash" | "mintAddress"> & { minsAgo: number };

export const SEED_LAUNCHES: SeedLaunch[] = [
  { id: "l1", launchpadId: "pumpfun", chain: "solana", name: "Halcyon", symbol: "HALO", imageUrl: "", status: "success", marketCapUsd: 412e3, minsAgo: 6 },
  { id: "l2", launchpadId: "clanker", chain: "base", name: "Driftwood", symbol: "DRIFT", imageUrl: "", status: "success", marketCapUsd: 88400, minsAgo: 24, mirrorGroup: "mg-seed-1", mirrorCount: 2 },
  { id: "l3", launchpadId: "fourmeme", chain: "bsc", name: "Driftwood", symbol: "DRIFT", imageUrl: "", status: "success", marketCapUsd: 31900, minsAgo: 51, mirrorGroup: "mg-seed-1", mirrorCount: 2 },
  { id: "l4", launchpadId: "robinhood-listings", chain: "robinhood", name: "Northgate Index", symbol: "NGX", imageUrl: "", status: "success", marketCapUsd: 56400, minsAgo: 96 },
  { id: "l5", launchpadId: "bags", chain: "solana", name: "Tessellate", symbol: "TESS", imageUrl: "", status: "failed", marketCapUsd: 0, minsAgo: 140 },
  { id: "l6", launchpadId: "zora", chain: "base", name: "Pale Signal", symbol: "PALE", imageUrl: "", status: "success", marketCapUsd: 19200, minsAgo: 213 },
];
