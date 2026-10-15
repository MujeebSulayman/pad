"use client";

import { CHAIN, CHAINS, LAUNCHPADS, STATUS_LABEL, type Launchpad } from "@/lib/data";
import { cn, fmtBps, fmtUsd } from "@/lib/format";
import { ChainMark, Receipt } from "../icons";
import { Reveal } from "../reveal";
import { SORTS, sortPads, type Sort } from "./launchpad-picker";
import { Section, SectionHead } from "./section";

const MAX_FEE = Math.max(...LAUNCHPADS.map((p) => p.tradeFeeBps));

/**
 * Every venue on one receipt, sorted the same way as the studio's picker.
 * Pressing a line makes it the venue and jumps back to the studio.
 */
export function VenueReport({ padId, sort, onSortChange, onSelectPad }: { padId: string; sort: Sort; onSortChange: (s: Sort) => void; onSelectPad: (p: Launchpad) => void }) {
  const pads = sortPads(LAUNCHPADS, sort);
  const picked = LAUNCHPADS.find((p) => p.id === padId);

  const pick = (p: Launchpad) => {
    onSelectPad(p);
    document.getElementById("studio-venue")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <Section id="venues">
      <div className="grid items-start gap-10 lg:grid-cols-[1fr_1.2fr]">
        <div className="lg:sticky lg:top-[calc(var(--nav-h)+48px)]">
          <SectionHead index="02" eyebrow="The venues" title="Every fee, side by side." />
          <Reveal variant="fade">
            <p className="-mt-4 max-w-[42ch] text-[16px] leading-relaxed text-dim">
              {LAUNCHPADS.length} launchpads across {CHAINS.length} chains, on one receipt. Trading fee sets the bar; creation cost, your creator
              split and the graduation threshold sit underneath.
            </p>
            <p className="mt-4 max-w-[42ch] text-[16px] leading-relaxed text-dim">Press a line to make it your venue.</p>
            <div className="seg seg-sm mt-7 max-w-full overflow-x-auto" role="group" aria-label="Sort venues">
              {SORTS.map((s) => (
                <button key={s.id} onClick={() => onSortChange(s.id)} aria-pressed={sort === s.id}>
                  {s.label}
                </button>
              ))}
            </div>
          </Reveal>
        </div>

        <Reveal variant="right">
          <div className="glass rounded-[30px]" data-lg="surface" data-lg-r="30" data-lg-tint="card">
            <div className="flex items-center justify-between border-b border-dashed border-line2 px-6 py-5 sm:px-8">
              <span className="font-mono text-[12px] uppercase tracking-[0.16em] text-dim">ShadowPad · trading fee by venue</span>
              <Receipt size={18} className="text-accent" />
            </div>
            <div className="grid gap-1 px-6 py-5 sm:px-8">
              {pads.map((p) => {
                const c = CHAIN[p.chain];
                const on = p.id === padId;
                return (
                  <button key={p.id} type="button" className="report-row" aria-pressed={on} onClick={() => pick(p)}>
                    <span className="receipt-row">
                      <span className="flex min-w-0 items-center gap-2">
                        <span className="shrink-0" style={{ color: c.accent }}>
                          <ChainMark chain={c.mark} size={14} />
                        </span>
                        <span className={cn("truncate text-[15.5px] font-semibold tracking-[-0.015em]", on && "text-accent")}>{p.name}</span>
                        {p.status !== "live" && <span className="shrink-0 font-mono text-[10px] uppercase tracking-[0.1em] text-mute">{STATUS_LABEL[p.status]}</span>}
                      </span>
                      <span className="leader" />
                      <span className={cn("shrink-0 font-mono text-[15px] font-medium tabular-nums", on && "text-accent")}>{fmtBps(p.tradeFeeBps)}</span>
                    </span>
                    <span className="mt-1 block truncate font-mono text-[11.5px] text-mute">
                      {p.createFee ? `${p.createFee} ${c.nativeToken}` : "free"} to create · {p.creatorRevBps ? `${fmtBps(p.creatorRevBps)} to you` : "no creator split"} ·{" "}
                      {p.graduationUsd ? `graduates at ${fmtUsd(p.graduationUsd)}` : "no curve"}
                    </span>
                    <span className={cn("meter mt-2.5", on && "is-accent")}>
                      <i style={{ width: `${Math.max(3, (p.tradeFeeBps / MAX_FEE) * 100)}%` }} />
                    </span>
                  </button>
                );
              })}
            </div>
            <div className="flex items-center justify-between gap-4 border-t border-dashed border-line2 px-6 py-5 font-mono text-[12.5px] sm:px-8">
              <span className="uppercase tracking-[0.14em] text-dim">Your venue</span>
              <span className="truncate text-accent">{picked ? `${picked.name} · ${fmtBps(picked.tradeFeeBps)}` : "—"}</span>
            </div>
          </div>
        </Reveal>
      </div>
    </Section>
  );
}
