"use client";

import { CHAIN, CHAINS, PAD, padsOn, type ChainId, type Mirrors } from "@/lib/data";
import { cn, fmtBps } from "@/lib/format";
import { ChainMark, Info } from "../icons";
import { Select, Switch } from "../ui";

export function MirrorPicker({ primaryChain, mirrors, onChange }: { primaryChain: ChainId; mirrors: Mirrors; onChange: (m: Mirrors) => void }) {
  const others = CHAINS.filter((c) => c.id !== primaryChain);
  const enabled = others.filter((c) => mirrors[c.id]);

  const toggle = (id: ChainId, on: boolean) => {
    const next = { ...mirrors };
    if (on) next[id] = padsOn(id)[0].id;
    else delete next[id];
    onChange(next);
  };

  const tokens = [primaryChain, ...enabled.map((c) => c.id)].map((id) => CHAIN[id].nativeToken).filter((t, i, all) => all.indexOf(t) === i);

  return (
    <div className="card overflow-hidden !rounded-[26px]">
      <div className="flex items-start gap-3 border-b border-line px-5 py-4">
        <span className="mt-px shrink-0 text-accent">
          <Info size={15} />
        </span>
        <p className="text-[13px] leading-[19px] text-dim">
          A mirror deploys the same name, symbol, description and image to another chain in the same run. Each chain gets its own contract and its own
          liquidity — mirrors are not bridged, and supply is not shared.
        </p>
      </div>

      <div className="divide-y divide-[var(--line)]">
        {others.map((c) => {
          const on = !!mirrors[c.id];
          const pads = padsOn(c.id);
          const pad = mirrors[c.id] ? PAD[mirrors[c.id]!] : null;
          return (
            <div key={c.id} className={cn("flex flex-wrap items-center gap-x-3.5 gap-y-3 px-5 py-4 transition-colors duration-300", on && "bg-[color-mix(in_srgb,var(--fg)_3%,transparent)]")}>
              <Switch checked={on} onChange={(v) => toggle(c.id, v)} label={`Mirror to ${c.name}`} />
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[12px] bg-[var(--knob)] shadow-[var(--edge-sm)]" style={{ color: c.accent }}>
                <ChainMark chain={c.mark} size={17} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[14px] font-semibold">{c.name}</p>
                <p className="font-mono text-[11.5px] text-mute">
                  {on && pad
                    ? `${pad.createFee || 0} ${c.nativeToken} · ${fmtBps(pad.tradeFeeBps)} trade fee`
                    : `${pads.length} venue${pads.length === 1 ? "" : "s"} available`}
                </p>
              </div>
              <div className={cn("w-full transition-opacity duration-300 sm:w-[220px]", !on && "opacity-40")}>
                <Select disabled={!on} aria-label={`${c.name} venue`} value={mirrors[c.id] ?? pads[0].id} onChange={(e) => onChange({ ...mirrors, [c.id]: e.target.value })}>
                  {pads.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                      {p.status !== "live" ? " — review" : ""}
                    </option>
                  ))}
                </Select>
              </div>
            </div>
          );
        })}
      </div>

      {enabled.length > 0 && (
        <div className="fade-in flex flex-wrap items-center justify-between gap-2 border-t border-line px-5 py-3">
          <p className="text-[13px] text-dim">
            Deploying to <span className="font-semibold text-fg">{enabled.length + 1} chains</span> in one run.
          </p>
          <p className="font-mono text-[11.5px] text-mute">
            {enabled.length + 1} signature{enabled.length ? "s" : ""} · {tokens.join(" + ")} needed
          </p>
        </div>
      )}
    </div>
  );
}
