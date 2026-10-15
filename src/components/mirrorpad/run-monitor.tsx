"use client";

import { CHAINS, PAD, type ChainId, type Draft, type Launchpad, type Mirrors } from "@/lib/data";
import { cn } from "@/lib/format";
import { costLegs, totalUsd } from "@/lib/launch";
import { usePrices } from "../use-prices";
import { ChainMark } from "../icons";
import { TokenAvatar } from "../ui";

/**
 * The hero visual: the run you're about to sign, as a live monitor. Token on top, the route
 * across the four chains (lit where it deploys), then what it costs, split by chain.
 */
export function RunMonitor({
  chain,
  pad,
  draft,
  mirrors,
  issues,
  onSelectChain,
}: {
  chain: ChainId;
  pad: Launchpad;
  draft: Draft;
  mirrors: Mirrors;
  issues: string[];
  onSelectChain: (c: ChainId) => void;
}) {
  const prices = usePrices();
  const legs = costLegs(pad, draft, mirrors, prices);
  const usd = totalUsd(legs);
  const venueOn = (id: ChainId) => (id === chain ? pad : mirrors[id] ? PAD[mirrors[id]!] : null);
  const ready = issues.length === 0;

  return (
    <div className="flex w-full max-w-[440px] flex-col items-center">
      <div className="glass w-full rounded-[34px] p-5 sm:p-6" data-lg="surface" data-lg-r="34" data-lg-tint="card">
        <div className="flex items-center justify-between">
          <span className="label">Run monitor</span>
          <span className="pill !h-7 font-mono text-[11px]">
            <span className={cn("h-1.5 w-1.5 rounded-full", ready ? "animate-pulse bg-good shadow-[0_0_10px_var(--good)]" : "bg-t-amber")} />
            {ready ? "ready to sign" : `${issues.length} to fill`}
          </span>
        </div>

        {/* 1. The token, as every venue will copy it. */}
        <div className="field mt-4 flex items-center gap-3 !pr-3">
          <span>Token</span>
          <p className="min-w-0 flex-1 truncate px-4 pb-3 pt-[29px] text-[17px] font-semibold leading-snug tracking-[-0.02em]">
            {draft.name || <span className="font-normal text-mute">Untitled token</span>}
            <span className="ml-2 font-mono text-[12.5px] font-normal text-mute">${draft.symbol || "TOKEN"}</span>
          </p>
          <div className="shrink-0">
            <TokenAvatar imageUrl={draft.imageUrl} symbol={draft.symbol} className="h-11 w-11 rounded-[14px] text-[12px]" />
          </div>
        </div>

        {/* 2. Where it deploys. */}
        <div className="mt-5">
          <p className="label">
            {legs.length === 1 ? "One deployment" : `${legs.length} independent deployments`}
          </p>
          <div className="mt-3 grid grid-cols-4 gap-2">
            {CHAINS.map((c) => {
              const v = venueOn(c.id);
              const primary = c.id === chain;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => onSelectChain(c.id)}
                  title={`Make ${c.name} the primary chain`}
                  className={cn(
                    "flex min-w-0 flex-col items-center gap-1.5 rounded-[18px] px-1 py-3 transition-all duration-500",
                    v ? "bg-[var(--knob)] shadow-[var(--edge-sm)]" : "bg-[var(--field-bg)] opacity-60 hover:opacity-90",
                  )}
                  style={v ? { boxShadow: `var(--edge-sm), 0 0 24px -10px ${c.accent}` } : undefined}
                >
                  <span style={{ color: v ? c.accent : "var(--mute)" }}>
                    <ChainMark chain={c.mark} size={20} />
                  </span>
                  <span className={cn("text-[12px] font-semibold", !v && "text-mute")}>{c.shortName}</span>
                  <span className={cn("font-mono text-[9.5px] uppercase tracking-[0.1em]", primary ? "text-accent" : "text-mute")}>
                    {primary ? "primary" : v ? "shadow" : "off"}
                  </span>
                </button>
              );
            })}
          </div>
          <p className="mt-2.5 truncate text-center text-[12.5px] text-mute">
            {legs.map((l) => l.pad.name).join(" · ")}
          </p>
        </div>

        {/* 3. What it costs, split by chain. */}
        <div className="card-2 mt-5 rounded-[20px] p-4">
          <div className="flex items-baseline justify-between">
            <span className="label">Estimated total</span>
            <span className="font-mono text-[15px] font-semibold tabular-nums">${usd.toFixed(2)}</span>
          </div>
          <div className="mt-3 flex h-[6px] gap-[3px] overflow-hidden rounded-full">
            {legs.map((l) => (
              <i
                key={l.pad.id}
                className="block h-full rounded-full transition-all duration-700"
                style={{ flexGrow: Math.max(l.usd, usd * 0.04), background: l.chain.accent, boxShadow: `0 0 10px ${l.chain.accent}` }}
              />
            ))}
          </div>
          <div className="mt-2.5 flex flex-wrap justify-between gap-x-3 gap-y-1 font-mono text-[11px] text-mute">
            {legs.map((l) => (
              <span key={l.pad.id} className="inline-flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full" style={{ background: l.chain.accent }} />
                {l.chain.shortName} ${l.usd.toFixed(2)}
              </span>
            ))}
          </div>
        </div>
      </div>
      <p className="mt-5 text-center font-mono text-[11px] uppercase tracking-[0.12em] text-mute">Updates live as you fill the studio</p>
    </div>
  );
}
