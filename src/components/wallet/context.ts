"use client";

import { createContext, useContext } from "react";
import type { ChainId } from "@/lib/data";

export type WalletMode = "privy" | "simulated";

export type Wallet = {
  mode: WalletMode;
  /** False until the wallet provider has loaded and restored any session. */
  ready: boolean;
  connected: boolean;
  /** The signing address on `chain`: a Solana wallet on Solana, an EVM wallet everywhere else. */
  addressFor: (chain: ChainId) => string | null;
  connect: () => void;
  disconnect: () => void;
};

export const WalletContext = createContext<Wallet>({
  mode: "simulated",
  ready: false,
  connected: false,
  addressFor: () => null,
  connect: () => {},
  disconnect: () => {},
});

export const useWallet = () => useContext(WalletContext);
