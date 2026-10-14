"use client";

import type { CSSProperties, ReactNode } from "react";
import { CHAIN, LAUNCHPADS, STATUS_LABEL, type ChainId, type Launchpad, type PadStatus } from "@/lib/data";
import { cn, fmtBps, fmtUsd } from "@/lib/format";
import { ArrowUpRight, ChainMark, Check } from "../icons";
import { Badge, type Tone } from "../ui";

export type Scope = "chain" | "all";
export type Sort = "default" | "cheapest" | "creator";

export const STATUS_TONE: Record<PadStatus, Tone> = { live: "green", beta: "blue", waitlist: "amber", approval: "purple" };

export const SORTS: { id: Sort; label: string }[] = [
  { id: "default", label: "Recommended" },
  { id: "cheapest", label: "Lowest fees" },
  { id: "creator", label: "Best creator split" },
];

export function sortPads(pads: Launchpad[], sort: Sort) {
  return [...pads].sort((a, b) =>
    sort === "cheapest" ? a.tradeFeeBps - b.tradeFeeBps || a.createFee - b.createFee : sort === "creator" ? b.creatorRevBps - a.creatorRevBps : 0,
  );
}

function Stat({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="min-w-0">
      <p className="truncate font-mono text-[10px] uppercase tracking-[0.1em] text-mute">{label}</p>
      <p className="mt-1 truncate font-mono text-[12.5px] text-fg">{value}</p>
    </div>
  );
}

function PadCard({ pad, active, showChain, onSelect }: { pad: Launchpad; active: boolean; showChain: boolean; onSelect: () => void }) {
  const chain = CHAIN[pad.chain];
  return (
    <div
      role="radio"
      aria-checked={active}
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect();
        }
      }}
      className="tile cursor-pointer rounded-[24px] p-4 sm:p-5"
      style={{ "--tile-accent": chain.accent } as CSSProperties}
    >
      <div className="flex items-start gap-3">
        <span
          className="mt-0.5 grid h-10 w-10 shrink-0 place-items-center rounded-[13px] text-[15px] font-semibold shadow-[var(--edge-sm)]"
          style={{ color: chain.accent, background: `color-mix(in srgb, ${chain.accent} 14%, var(--knob))` }}
        >
          {pad.name.slice(0, 1)}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <h4 className="text-[15px] font-semibold tracking-[-0.015em]">{pad.name}</h4>
            <Badge tone={STATUS_TONE[pad.status]} dot={pad.status === "live"}>
              {STATUS_LABEL[pad.status]}
            </Badge>
            {showChain && (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold" style={{ color: chain.accent }}>
                <ChainMark chain={chain.mark} size={11} />
                {chain.shortName}
              </span>
            )}
          </div>
          <p className="mt-1 text-[13px] leading-[18px] text-dim">{pad.tagline}</p>
        </div>
        <span className={cn("tick mt-1", active && "on")}>{active && <Check size={11} strokeWidth={2.2} />}</span>
      </div>

      <div className="mt-4 grid grid-cols-4 gap-2 rounded-[16px] bg-[var(--field-bg)] px-3 py-2.5 shadow-[var(--field-in)]">
        <Stat label="Create" value={pad.createFee ? `${pad.createFee} ${chain.nativeToken}` : "Free"} />
        <Stat label="Trade fee" value={fmtBps(pad.tradeFeeBps)} />
        <Stat label="Creator" value={pad.creatorRevBps ? fmtBps(pad.creatorRevBps) : "—"} />
        <Stat label="Graduate" value={pad.graduationUsd ? fmtUsd(pad.graduationUsd) : "n/a"} />
      </div>

      <div className={cn("grid transition-all duration-500 [transition-timing-function:var(--ease-out)]", active ? "mt-4 grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0")}>
        <div className="overflow-hidden">
          <p className="text-[13px] leading-[20px] text-dim">{pad.description}</p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {pad.features.map((f) => (
              <span key={f} className="rounded-full bg-[var(--steel)] px-2.5 py-1 text-[11.5px] text-dim shadow-[inset_0_1px_0_var(--rim)]">
                {f}
              </span>
            ))}
          </div>
          <a
            href={pad.url}
            target="_blank"
            rel="noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="mt-3 inline-flex items-center gap-1 text-[12.5px] font-semibold text-accent hover:underline"
          >
            {pad.url.replace(/^https?:\/\//, "")}
            <ArrowUpRight size={12} />
          </a>
        </div>
      </div>
    </div>
  );
}

export function LaunchpadPicker({
  chain,
  value,
  scope,
  sort,
  onScopeChange,
  onSortChange,
  onChange,
}: {
  chain: ChainId;
  value: string;
  scope: Scope;
  sort: Sort;
  onScopeChange: (s: Scope) => void;
  onSortChange: (s: Sort) => void;
  onChange: (p: Launchpad) => void;
}) {
  const pads = sortPads(
    LAUNCHPADS.filter((p) => scope === "all" || p.chain === chain),
    sort,
  );
  return (
    <div>
      <div className="mb-3.5 flex flex-wrap items-center justify-between gap-2">
        <div className="seg seg-sm" role="group" aria-label="Scope">
          {[
            { id: "chain" as const, label: CHAIN[chain].shortName },
            { id: "all" as const, label: `All ${LAUNCHPADS.length}` },
          ].map((s) => (
            <button key={s.id} onClick={() => onScopeChange(s.id)} aria-pressed={scope === s.id}>
              {s.label}
            </button>
          ))}
        </div>
        <div className="seg seg-sm max-w-full overflow-x-auto" role="group" aria-label="Sort">
          {SORTS.map((s) => (
            <button key={s.id} onClick={() => onSortChange(s.id)} aria-pressed={sort === s.id}>
              {s.label}
            </button>
          ))}
        </div>
      </div>
      <div role="radiogroup" aria-label="Launchpad" className="grid items-start gap-3 md:grid-cols-2">
        {pads.map((p) => (
          <PadCard key={p.id} pad={p} showChain={scope === "all"} active={p.id === value} onSelect={() => onChange(p)} />
        ))}
      </div>
    </div>
  );
}
