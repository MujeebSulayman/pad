"use client";

import { useEffect, useState } from "react";
import type { ChainId } from "@/lib/data";
import { nativeBalance } from "@/lib/rpc";

export type Balance = { value: number | null; loading: boolean; error: string | null };

/** Native balance of `address` on `chain`, refreshed every 30 s. Null address → nothing fetched. */
export function useBalance(chain: ChainId, address: string | null, enabled = true): Balance {
  const [state, setState] = useState<Balance>({ value: null, loading: false, error: null });

  useEffect(() => {
    if (!address || !enabled) {
      setState({ value: null, loading: false, error: null });
      return;
    }
    let alive = true;
    const load = () => {
      setState((s) => ({ ...s, loading: true }));
      nativeBalance(chain, address)
        .then((value) => alive && setState({ value, loading: false, error: null }))
        .catch((e: Error) => alive && setState({ value: null, loading: false, error: e.message }));
    };
    load();
    const t = setInterval(load, 30_000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [chain, address, enabled]);

  return state;
}
