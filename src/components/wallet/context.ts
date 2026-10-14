"use client";

import { createContext, useContext } from "react";
import type { Address, Hex, WalletClient } from "viem";
import type { ChainId } from "@/lib/data";

export type WalletMode = "privy" | "simulated";

/** What a real wallet session can sign. Only Privy sessions have one; the simulated wallet doesn't. */
export type Signer = {
  /** Privy access token for our API routes. */
  getAccessToken: () => Promise<string | null>;
  solana: {
    address: string;
    /** Adds the wallet's signature to a serialized transaction, keeping any signatures already on it. */
    signTransaction: (tx: Uint8Array) => Promise<Uint8Array>;
  } | null;
  evm: {
    address: Address;
    /** A viem wallet client on `chain`, switching the wallet to it first. */
    walletClient: (chain: Exclude<ChainId, "solana">) => Promise<WalletClient>;
    signMessage: (message: string) => Promise<Hex>;
  } | null;
};

export type Wallet = {
  mode: WalletMode;
  /** False until the wallet provider has loaded and restored any session. */
  ready: boolean;
  connected: boolean;
  /** The signing address on `chain`: a Solana wallet on Solana, an EVM wallet everywhere else. */
  addressFor: (chain: ChainId) => string | null;
  connect: () => void;
  disconnect: () => void;
  /** Present once a real (Privy) session is connected. */
  signer: Signer | null;
};

export const WalletContext = createContext<Wallet>({
  mode: "simulated",
  ready: false,
  connected: false,
  addressFor: () => null,
  connect: () => {},
  disconnect: () => {},
  signer: null,
});

export const useWallet = () => useContext(WalletContext);
