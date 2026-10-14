"use client";

import { useMemo, useState } from "react";
import { CHAIN, EMPTY_DRAFT, PAD, SEED_LAUNCHES, padsOn, type ChainId, type Draft, type Launch, type Launchpad, type Mirrors } from "@/lib/data";
import { mintAddress, txHash } from "@/lib/format";
import { validate } from "@/lib/launch";
import { useToast } from "../toast";
import { DesktopView } from "./desktop";
import { LaunchModal } from "./launch-modal";
import type { Scope, Sort } from "./launchpad-picker";
import { MobileView } from "./mobile";
import type { ViewProps } from "./types";

/** The whole app's state. Desktop (lg and up) and phones get different layouts over the same state. */
export function MirrorPad() {
  const toast = useToast();
  const [chain, setChain] = useState<ChainId>("solana");
  const [padId, setPadId] = useState("pumpfun");
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [connected, setConnected] = useState(false);
  const [runOpen, setRunOpen] = useState(false);
  const [runs, setRuns] = useState(0);
  const [scope, setScope] = useState<Scope>("chain");
  const [sort, setSort] = useState<Sort>("default");
  const [mirrors, setMirrors] = useState<Mirrors>({});
  const [launches, setLaunches] = useState<Launch[]>(() => {
    const now = Date.now();
    return SEED_LAUNCHES.map(({ minsAgo, ...l }) => ({
      ...l,
      createdAt: now - minsAgo * 60_000,
      txHash: txHash(l.chain, l.id),
      mintAddress: mintAddress(l.chain, l.id),
    }));
  });

  const pad = PAD[padId];
  const chainInfo = CHAIN[chain];
  const address = useMemo(() => mintAddress(chain, "wallet-session"), [chain]);
  const { errors, issues } = useMemo(() => validate(draft, pad), [draft, pad]);

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

  const connect = () => {
    setConnected(true);
    toast({ tone: "success", title: "Wallet connected", description: `Signing on ${chainInfo.name}.` });
  };
  const disconnect = () => {
    setConnected(false);
    toast({ tone: "info", title: "Wallet disconnected" });
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
    connected,
    address,
    scope,
    sort,
    onScopeChange: setScope,
    onSortChange: setSort,
    onSelectChain: selectChain,
    onSelectPad: selectPad,
    onDraftChange: (patch) => setDraft((d) => ({ ...d, ...patch })),
    onMirrorsChange: setMirrors,
    onConnect: connect,
    onDisconnect: disconnect,
    onLaunch: launch,
  };

  return (
    <>
      <DesktopView {...view} />
      <MobileView {...view} />
      {runs > 0 && (
        <LaunchModal
          key={runs}
          open={runOpen}
          onClose={() => setRunOpen(false)}
          pad={pad}
          draft={draft}
          mirrors={mirrors}
          onComplete={(rows) => setLaunches((all) => [...rows, ...all])}
        />
      )}
    </>
  );
}
