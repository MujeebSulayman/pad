"use client";

import { CHAINS, PAD, type ChainId, type Draft, type Mirrors } from "@/lib/data";
import { cn } from "@/lib/format";
import { ChainMark } from "../icons";
import { TokenAvatar } from "../ui";

const W = 400;
const H = 320;
const CENTER = { x: W / 2, y: H / 2 };
const NODES: Record<ChainId, { x: number; y: number }> = {
  robinhood: { x: 78, y: 62 },
  solana: { x: W - 78, y: 62 },
  base: { x: 78, y: H - 62 },
  bsc: { x: W - 78, y: H - 62 },
};

/**
 * The hero visual: the token in the middle, wired to its primary chain and to every mirror.
 * It follows the form live, so the picture is always the run you're about to sign.
 */
export function MirrorDiagram({ chain, padId, mirrors, draft }: { chain: ChainId; padId: string; mirrors: Mirrors; draft: Draft }) {
  const venueOn = (id: ChainId) => (id === chain ? PAD[padId] : mirrors[id] ? PAD[mirrors[id]!] : null);
  const live = 1 + Object.keys(mirrors).length;

  return (
    <div className="glass relative w-full max-w-[460px] rounded-[36px] p-5 sm:p-6" data-lg="surface" data-lg-r="36" data-lg-tint="card">
      <div className="flex items-center justify-between">
        <p className="label">This run</p>
        <p className="font-mono text-[11px] text-mute">
          {live} deployment{live === 1 ? "" : "s"}
        </p>
      </div>
      <div className="relative mx-auto mt-2 aspect-[400/320] w-full">
        <svg viewBox={`0 0 ${W} ${H}`} className="absolute inset-0 h-full w-full" aria-hidden>
          {CHAINS.map((c) => {
            const n = NODES[c.id];
            const on = !!venueOn(c.id);
            return (
              <line
                key={c.id}
                x1={CENTER.x}
                y1={CENTER.y}
                x2={n.x}
                y2={n.y}
                stroke={on ? c.accent : "var(--line2)"}
                strokeWidth={on ? 1.6 : 1}
                strokeLinecap="round"
                className={on ? "flow" : undefined}
                strokeDasharray={on ? undefined : "2 6"}
                style={{ transition: "stroke .4s" }}
              />
            );
          })}
        </svg>

        <div className="absolute -translate-x-1/2 -translate-y-1/2" style={{ left: `${(CENTER.x / W) * 100}%`, top: `${(CENTER.y / H) * 100}%` }}>
          <div className="flex flex-col items-center gap-1.5">
            <TokenAvatar imageUrl={draft.imageUrl} symbol={draft.symbol} className="h-16 w-16 rounded-[20px] text-[18px] ring-1 ring-[var(--line2)]" />
            <span className="rounded-full bg-[var(--knob)] px-2.5 py-0.5 font-mono text-[11px] shadow-[var(--edge-sm)]">${draft.symbol || "TOKEN"}</span>
          </div>
        </div>

        {CHAINS.map((c) => {
          const n = NODES[c.id];
          const pad = venueOn(c.id);
          const primary = c.id === chain;
          return (
            <div
              key={c.id}
              className="absolute -translate-x-1/2 -translate-y-1/2 text-center"
              style={{ left: `${(n.x / W) * 100}%`, top: `${(n.y / H) * 100}%` }}
            >
              <span
                className={cn(
                  "mx-auto grid h-12 w-12 place-items-center rounded-[16px] bg-[var(--knob)] shadow-[var(--edge-sm)] transition-all duration-500",
                  !pad && "opacity-45 grayscale",
                )}
                style={{ color: c.accent, boxShadow: pad ? `var(--edge-sm), 0 0 26px -6px ${c.accent}` : undefined }}
              >
                <ChainMark chain={c.mark} size={22} />
              </span>
              <p className={cn("mt-1.5 text-[12px] font-semibold", !pad && "text-mute")}>{c.shortName}</p>
              <p className="max-w-[110px] truncate font-mono text-[10px] text-mute">{pad ? `${primary ? "primary" : "mirror"} · ${pad.name}` : "off"}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
