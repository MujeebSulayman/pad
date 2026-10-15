"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CHAIN, EMPTY_DRAFT, PAD, SEED_LAUNCHES, padsOn, type ChainId, type Draft, type Launch, type Launchpad, type Mirrors } from "@/lib/data";
import { api } from "@/lib/api";
import { PRIVY_APP_ID } from "@/lib/env";
import { mintAddress, txHash } from "@/lib/format";
import { validate } from "@/lib/launch";
import { useToast } from "../toast";
import { useWallet } from "../wallet/context";
import { useBalance } from "../wallet/use-balance";
import { DesktopView } from "./desktop";
import { LaunchModal } from "./launch-modal";
import type { Scope, Sort } from "./launchpad-picker";
import { MobileView } from "./mobile";
import { TradeModal } from "./trade-modal";
import type { ViewProps } from "./types";

/** The whole app's state. Desktop (lg and up) and phones get different layouts over the same state. */
export function MirrorPad() {
  const toast = useToast();
  const [chain, setChain] = useState<ChainId>("solana");
  const [padId, setPadId] = useState("pumpfun");
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [runOpen, setRunOpen] = useState(false);
  const [runs, setRuns] = useState(0);
  const [scope, setScope] = useState<Scope>("chain");
  const [sort, setSort] = useState<Sort>("default");
  const [mirrors, setMirrors] = useState<Mirrors>({});
  const [trading, setTrading] = useState<Launch | null>(null);
  // The demo build shows sample rows; with real wallets the feed only holds verified launches.
  const [launches, setLaunches] = useState<Launch[]>(() => {
    if (PRIVY_APP_ID) return [];
    const now = Date.now();
    return SEED_LAUNCHES.map(({ minsAgo, ...l }) => ({
      ...l,
      createdAt: now - minsAgo * 60_000,
      txHash: txHash(l.chain, l.id),
      mintAddress: mintAddress(l.chain, l.id),
    }));
  });

  // The shared feed from the database, refreshed every minute. Missing database → keep what we have.
  useEffect(() => {
    let alive = true;
    const load = () =>
      api<{ launches: Launch[] }>("/api/launches")
        .then(({ launches: rows }) => alive && setLaunches((cur) => (rows.length || PRIVY_APP_ID ? rows : cur)))
        .catch(() => {});
    load();
    const t = setInterval(load, 60_000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, []);

  const pad = PAD[padId];
  const chainInfo = CHAIN[chain];
  const wallet = useWallet();
  const connected = wallet.connected;
  const address = wallet.addressFor(chain);
  // Simulated addresses don't exist on-chain, so only real wallets get a balance lookup.
  const balance = useBalance(chain, address, wallet.mode === "privy");
  const { errors, issues } = useMemo(() => validate(draft, pad), [draft, pad]);

  // Toast on connect / disconnect, but not when a saved session is restored on load.
  const wasConnected = useRef<boolean | null>(null);
  useEffect(() => {
    if (!wallet.ready) return;
    if (wasConnected.current === null) {
      wasConnected.current = connected;
      return;
    }
    if (wasConnected.current === connected) return;
    wasConnected.current = connected;
    toast(connected ? { tone: "success", title: "Wallet connected", description: `Signing on ${chainInfo.name}.` } : { tone: "info", title: "Wallet disconnected" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wallet.ready, connected]);

  /** Switch primary chain: its first venue becomes the pick, and it can no longer be a mirror. */
  const selectChain = (c: ChainId) => {
    setChain(c);
    setPadId(padsOn(c)[0].id);
    setMirrors((m) => {
      if (!m[c]) return m;
      const next = { ...m };
      delete next[c];
      return next;
    });
  };
  const selectPad = (p: Launchpad) => {
    if (p.chain !== chain) selectChain(p.chain);
    setPadId(p.id);
  };

  const launch = () => {
    setRuns((n) => n + 1);
    setRunOpen(true);
  };

  const view: ViewProps = {
    chain,
    chainInfo,
    pad,
    padId,
    draft,
    errors,
    issues,
    mirrors,
    launches,
    walletReady: wallet.ready,
    connected,
    address,
    balance,
    scope,
    sort,
    onScopeChange: setScope,
    onSortChange: setSort,
    onSelectChain: selectChain,
    onSelectPad: selectPad,
    onDraftChange: (patch) => setDraft((d) => ({ ...d, ...patch })),
    onMirrorsChange: setMirrors,
    onConnect: wallet.connect,
    onDisconnect: wallet.disconnect,
    onLaunch: launch,
    onTrade: PRIVY_APP_ID ? setTrading : undefined,
  };

  return (
    <>
      <DesktopView {...view} />
      <MobileView {...view} />
      {trading && <TradeModal key={trading.id} launch={trading} onClose={() => setTrading(null)} />}
      {runs > 0 && (
        <LaunchModal
          key={runs}
          open={runOpen}
          onClose={() => setRunOpen(false)}
          pad={pad}
          draft={draft}
          mirrors={mirrors}
          onComplete={(rows) => setLaunches((all) => [...rows, ...all.filter((l) => !rows.some((r) => r.id === l.id))])}
        />
      )}
    </>
  );
}
