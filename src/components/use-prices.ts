"use client";

import { useSyncExternalStore } from "react";
import { api } from "@/lib/api";
import { PRICES, type NativeToken } from "@/lib/data";

type Prices = Record<NativeToken, number>;

// One shared fetch for the whole page; the reference prices stand in until (or unless) it lands.
let current: Prices = PRICES;
let started = false;
const listeners = new Set<() => void>();

function load() {
  api<{ prices: Prices }>("/api/prices")
    .then(({ prices }) => {
      current = prices;
      listeners.forEach((l) => l());
    })
    .catch(() => {});
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (!started) {
    started = true;
    load();
    setInterval(load, 5 * 60_000);
  }
  return () => listeners.delete(listener);
}

/** Live SOL / ETH / BNB prices in USD, refreshed every five minutes. */
export const usePrices = () => useSyncExternalStore(subscribe, () => current, () => PRICES);
