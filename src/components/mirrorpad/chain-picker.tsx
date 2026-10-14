"use client";

import type { CSSProperties } from "react";
import { CHAINS, padsOn, type ChainId } from "@/lib/data";
import { Check, ChainMark } from "../icons";

export function ChainPicker({ value, onChange }: { value: ChainId; onChange: (c: ChainId) => void }) {
  return (
    <div role="radiogroup" aria-label="Target chain" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {CHAINS.map((c) => {
        const on = c.id === value;
        const n = padsOn(c.id).length;
        return (
          <button
            key={c.id}
            role="radio"
            aria-checked={on}
            onClick={() => onChange(c.id)}
            className="tile group flex flex-col gap-4 rounded-[24px] p-4 text-left"
            style={{ "--tile-accent": c.accent } as CSSProperties}
          >
            <span
              aria-hidden
              className="pointer-events-none absolute -right-10 -top-10 -z-10 h-32 w-32 rounded-full blur-2xl transition-opacity duration-500 group-hover:opacity-40"
              style={{ background: c.accent, opacity: on ? 0.42 : 0.18 }}
            />
            <div className="flex items-start justify-between">
              <span className="grid h-11 w-11 place-items-center rounded-[14px] bg-[var(--knob)] shadow-[var(--edge-sm)]" style={{ color: c.accent }}>
                <ChainMark chain={c.mark} size={22} />
              </span>
              <span className={on ? "tick on" : "tick"}>{on && <Check size={11} strokeWidth={2.2} />}</span>
            </div>
            <div>
              <p className="text-[15px] font-semibold tracking-[-0.015em]">{c.shortName}</p>
              <p className="mt-0.5 font-mono text-[11px] text-mute">
                {n} venue{n === 1 ? "" : "s"} · {c.nativeToken}
              </p>
            </div>
          </button>
        );
      })}
    </div>
  );
}
