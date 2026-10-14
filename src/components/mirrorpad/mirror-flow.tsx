"use client";

import { CHAINS, PAD, type ChainId, type Draft, type Launchpad, type Mirrors } from "@/lib/data";
import { ChainMark } from "../icons";
import { GlassBlob } from "../liquid-glass";
import { Reveal } from "../reveal";
import { Section, SectionHead } from "./section";

const SRC = { x: 170, y: 150, r: 56 };
const DST_X = 760;
const YS = [45, 115, 185, 255];

/** A glass tube from the token to one chain; lit ones carry a travelling highlight. */
function Tube({ y, lit, begin }: { y: number; lit: boolean; begin: number }) {
  const d = `M${SRC.x + SRC.r} ${SRC.y} C ${SRC.x + 300} ${SRC.y}, ${DST_X - 280} ${y}, ${DST_X - 30} ${y}`;
  if (!lit) return <path d={d} stroke="var(--line2)" strokeWidth="2" strokeDasharray="2 8" strokeLinecap="round" fill="none" />;
  return (
    <g>
      <path d={d} stroke="url(#lgChrome)" strokeWidth="11" strokeLinecap="round" fill="none" />
      <path d={d} stroke="url(#lgRim)" strokeWidth="11" strokeLinecap="round" fill="none" opacity="0.3" />
      <ellipse rx="10" ry="4" fill="url(#lgSpec)" opacity="0.85">
        <animateMotion dur="4.5s" begin={`${begin}s`} repeatCount="indefinite" path={d} rotate="auto" />
        <animate attributeName="opacity" values="0;0.95;0" dur="4.5s" begin={`${begin}s`} repeatCount="indefinite" />
      </ellipse>
    </g>
  );
}

/** The token packet flowing out to every chain in the run, then what a mirror is (and isn't). */
export function MirrorFlow({ chain, pad, draft, mirrors }: { chain: ChainId; pad: Launchpad; draft: Draft; mirrors: Mirrors }) {
  const venueOn = (id: ChainId) => (id === chain ? pad : mirrors[id] ? PAD[mirrors[id]!] : null);

  return (
    <Section id="how">
      <SectionHead
        index="03"
        eyebrow="How mirroring works"
        title={
          <>
            One packet in. <span className="text-mute">Four contracts out.</span>
          </>
        }
      />
      <Reveal variant="scale">
        <div className="glass rounded-[36px] p-6 sm:p-10 lg:p-12" data-lg="surface" data-lg-r="36" data-lg-tint="card">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="max-w-2xl">
              <p className="label">This run</p>
              <p className="mt-3 text-[clamp(22px,2.4vw,30px)] font-semibold leading-snug tracking-[-0.03em]">
                The metadata is written once. Every chain gets its own deployment of it.
              </p>
            </div>
            <a href="#studio-mirror" className="btn btn-sm btn-ghost">
              Change mirrors
            </a>
          </div>

          <div className="mt-8 overflow-x-auto pb-2">
            <svg viewBox="0 0 1050 300" fill="none" className="min-w-[640px] md:w-full md:min-w-0" role="img" aria-label="The token flows through glass tubes to each chain it deploys on.">
              {CHAINS.map((c, i) => (
                <Tube key={c.id} y={YS[i]} lit={!!venueOn(c.id)} begin={i * 0.7} />
              ))}

              <GlassBlob cx={SRC.x} cy={SRC.y} r={SRC.r} />
              <text x={SRC.x} y={SRC.y + SRC.r + 30} fill="currentColor" fontSize="15" fontWeight="600" textAnchor="middle">
                ${draft.symbol || "TOKEN"}
              </text>
              <text x={SRC.x} y={SRC.y + SRC.r + 48} fill="var(--mute)" fontSize="10.5" textAnchor="middle" letterSpacing="0.14em">
                METADATA · ONCE
              </text>

              {CHAINS.map((c, i) => {
                const v = venueOn(c.id);
                const y = YS[i];
                return (
                  <g key={c.id}>
                    <GlassBlob cx={DST_X} cy={y} r={24} dim={!v} />
                    <g transform={`translate(${DST_X - 11} ${y - 11})`} style={{ color: v ? c.accent : "var(--mute)" }}>
                      <ChainMark chain={c.mark} size={22} />
                    </g>
                    <text x={DST_X + 44} y={y - 2} fill={v ? "currentColor" : "var(--mute)"} fontSize="15" fontWeight="600">
                      {c.shortName}
                    </text>
                    <text x={DST_X + 44} y={y + 16} fill={c.id === chain ? "var(--accent)" : "var(--mute)"} fontSize="10.5" letterSpacing="0.1em">
                      {v ? `${c.id === chain ? "PRIMARY" : "MIRROR"} · ${v.name.toUpperCase()}` : "OFF"}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
        </div>
      </Reveal>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        {[
          { n: "01", title: "Its own contract", line: "Each chain gets a separate deployment of the same name, symbol, description and image." },
          { n: "02", title: "One signature per chain", line: "The run executes each venue's adapter in turn. You sign once for every chain in it." },
          { n: "03", title: "Nothing is bridged", line: "Supply and liquidity live separately on each chain. Mirrors share a name, not a pool." },
        ].map((p, i) => (
          <Reveal key={p.n} delay={i * 80} variant="scale" className="h-full">
            <article className="card flex h-full gap-5 p-7">
              <span className="font-mono text-[34px] font-medium leading-none tracking-[-0.06em] text-fg/15">{p.n}</span>
              <div>
                <h3 className="h3">{p.title}</h3>
                <p className="mt-2 text-[15px] leading-relaxed text-dim">{p.line}</p>
              </div>
            </article>
          </Reveal>
        ))}
      </div>
    </Section>
  );
}
