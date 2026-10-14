"use client";

import { useEffect, useState } from "react";
import { CHAIN, CHAINS, LAUNCHPADS, STATUS_LABEL, padsOn } from "@/lib/data";
import { cn, fmtBps, fmtUsd, shortAddr } from "@/lib/format";
import { costLegs, totalUsd } from "@/lib/launch";
import { Alert, ChainMark, Check, ChevronRight, Grid, Layers, Logo, Rocket, Wallet } from "../icons";
import { ThemeToggle } from "../theme";
import { Badge, Button, Notice } from "../ui";
import { ChainPicker } from "./chain-picker";
import { ActivityList } from "./launches";
import { LaunchpadPicker } from "./launchpad-picker";
import { TokenPreview } from "./launch-summary";
import { MirrorPicker } from "./mirror-picker";
import { TokenForm } from "./token-form";
import type { ViewProps } from "./types";
import { useDrop } from "./use-drop";

type Tab = "launch" | "venues" | "activity";

const TABS: { id: Tab; label: string; icon: typeof Rocket }[] = [
  { id: "launch", label: "Launch", icon: Rocket },
  { id: "venues", label: "Venues", icon: Grid },
  { id: "activity", label: "Activity", icon: Layers },
];

const STEPS = ["Chain", "Venue", "Token", "Mirror"];

function TabBar({ tab, onChange, badge }: { tab: Tab; onChange: (t: Tab) => void; badge: number }) {
  const drop = useDrop("tab", tab);
  return (
    <nav className="tabbar lgx" id="tabbar" aria-label="Sections" ref={drop.host}>
      <span className="drop" ref={drop.drop} aria-hidden />
      {TABS.map((t) => (
        <button key={t.id} onClick={() => onChange(t.id)} aria-current={t.id === tab ? "page" : undefined}>
          <span className="relative">
            <t.icon size={20} strokeWidth={t.id === tab ? 1.9 : 1.5} />
            {t.id === "activity" && !!badge && (
              <span className="absolute -right-2.5 -top-1.5 grid h-[16px] min-w-[16px] place-items-center rounded-full [background:var(--g-accent)] px-1 font-mono text-[9px] font-bold text-[var(--accent-ink)]">
                {badge}
              </span>
            )}
          </span>
          <span className="font-medium">{t.label}</span>
        </button>
      ))}
    </nav>
  );
}

function Heading({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <>
      <h2 className="text-[28px] leading-tight">{title}</h2>
      <p className="mb-5 mt-1.5 text-[14px] leading-[20px] text-dim">{children}</p>
    </>
  );
}

export function MobileView(p: ViewProps) {
  const [tab, setTab] = useState<Tab>("launch");
  const [step, setStep] = useState(0);
  const legs = costLegs(p.pad, p.draft, p.mirrors);
  const multi = legs.length > 1;
  const usd = totalUsd(legs);
  const ready = p.issues.length === 0;
  const last = step === STEPS.length - 1;

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [step, tab]);

  return (
    <div className="flex min-h-[100dvh] flex-col lg:hidden">
      <header className="topbar lgx">
        <Logo size={28} />
        <span className="text-[16px] font-semibold tracking-[-0.02em]">MirrorPad</span>
        <div className="ml-auto flex items-center gap-1.5">
          <ThemeToggle />
          {p.connected ? (
            <button onClick={p.onDisconnect} className="btn btn-sm btn-ghost !h-10 !gap-1.5 !px-3" title="Disconnect">
              <span className="grid h-[18px] w-[18px] place-items-center rounded-full bg-good text-[var(--accent-ink)]">
                <Check size={10} strokeWidth={2.4} />
              </span>
              <span className="font-mono text-[11.5px]">{shortAddr(p.address, 4, 4)}</span>
            </button>
          ) : (
            <Button variant="primary" size="sm" className="!h-10" onClick={p.onConnect}>
              Connect
            </Button>
          )}
        </div>
      </header>

      <main className="flex-1 px-4 pb-[calc(var(--mp-nav-h)+var(--mp-action-h)+28px)] pt-[calc(env(safe-area-inset-top,0px)+88px)]">
        {tab === "launch" && (
          <>
            <ol className="mb-6 flex items-center gap-2">
              {STEPS.map((s, i) => {
                const current = i === step;
                const complete = i === 2 ? ready : i < step;
                return (
                  <li key={s} className="flex-1">
                    <button onClick={() => setStep(i)} className="flex w-full flex-col gap-2" aria-current={current ? "step" : undefined}>
                      <span
                        className={cn(
                          "h-[4px] w-full rounded-full transition-all duration-500",
                          current ? "bg-fg" : complete ? "bg-accent shadow-[0_0_10px_var(--accent)]" : "bg-line2",
                        )}
                      />
                      <span className={cn("font-mono text-[10.5px] uppercase tracking-[0.1em]", current ? "text-fg" : "text-mute")}>{s}</span>
                    </button>
                  </li>
                );
              })}
            </ol>

            {step === 0 && (
              <section className="fade-in">
                <Heading title="Pick a primary chain">{p.chainInfo.note}</Heading>
                <ChainPicker value={p.chain} onChange={p.onSelectChain} />
              </section>
            )}

            {step === 1 && (
              <section className="fade-in">
                <Heading title="Pick a launchpad">
                  {p.scope === "chain" ? `${padsOn(p.chain).length} venues on ${p.chainInfo.name}.` : `Comparing all ${LAUNCHPADS.length} venues.`}
                </Heading>
                <LaunchpadPicker
                  chain={p.chain}
                  value={p.padId}
                  scope={p.scope}
                  sort={p.sort}
                  onScopeChange={p.onScopeChange}
                  onSortChange={p.onSortChange}
                  onChange={p.onSelectPad}
                />
              </section>
            )}

            {step === 2 && (
              <section className="fade-in">
                <Heading title="Configure the token">This metadata is what every mirror copies.</Heading>
                <TokenPreview pad={p.pad} draft={p.draft} mirrorCount={legs.length - 1} className="mb-4" />
                <div className="glass rounded-[28px] p-5" data-lg="surface" data-lg-r="28" data-lg-tint="card">
                  <TokenForm pad={p.pad} draft={p.draft} errors={p.errors} onChange={p.onDraftChange} />
                </div>
              </section>
            )}

            {step === 3 && (
              <section className="fade-in">
                <Heading title="Mirror to other chains">Optional. Launch on {p.chainInfo.shortName} alone, or deploy the same token across several chains in one run.</Heading>
                <MirrorPicker primaryChain={p.chain} mirrors={p.mirrors} onChange={p.onMirrorsChange} />
                <div className="glass mt-4 rounded-[26px] p-5" data-lg="surface" data-lg-r="26" data-lg-tint="card">
                  <h3 className="label !text-fg">Launch cost</h3>
                  <div className="mt-2 divide-y divide-[var(--line)]">
                    {legs.map((l) => (
                      <div key={l.pad.id} className="flex items-center justify-between gap-3 py-2.5">
                        <span className="flex min-w-0 items-center gap-2 text-[13.5px] text-dim">
                          <span style={{ color: l.chain.accent }}>
                            <ChainMark chain={l.chain.mark} size={14} />
                          </span>
                          <span className="truncate">{l.pad.name}</span>
                          {l.mirror && <Badge tone="purple">mirror</Badge>}
                        </span>
                        <span className="shrink-0 font-mono text-[12.5px] tabular-nums">
                          {l.native.toFixed(4)} {l.chain.nativeToken}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-2 flex items-center justify-between border-t border-line pt-3">
                    <span className="text-[13.5px] font-semibold">{multi ? `Total across ${legs.length} chains` : "Total"}</span>
                    <span className="font-mono text-[15px] font-semibold tabular-nums">${usd.toFixed(2)}</span>
                  </div>
                </div>
                {p.pad.status !== "live" && (
                  <div className="mt-3">
                    <Notice tone="blue" icon={<Alert size={14} />}>
                      {p.pad.name} reviews submissions before they go live. This launch will be queued as pending.
                    </Notice>
                  </div>
                )}
              </section>
            )}
          </>
        )}

        {tab === "venues" && (
          <section className="fade-in">
            <Heading title="Venues">
              All {LAUNCHPADS.length} launchpads across {CHAINS.length} chains.
            </Heading>
            <div className="flex flex-col gap-2.5">
              {LAUNCHPADS.map((v) => {
                const c = CHAIN[v.chain];
                return (
                  <button
                    key={v.id}
                    onClick={() => {
                      p.onSelectPad(v);
                      setTab("launch");
                      setStep(1);
                    }}
                    className="tile flex items-center gap-3 rounded-[22px] p-3.5 text-left"
                  >
                    <span
                      className="grid h-11 w-11 shrink-0 place-items-center rounded-[14px] text-[16px] font-semibold shadow-[var(--edge-sm)]"
                      style={{ color: c.accent, background: `color-mix(in srgb, ${c.accent} 14%, var(--knob))` }}
                    >
                      {v.name.slice(0, 1)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-[14.5px] font-semibold">{v.name}</p>
                        <Badge tone={v.status === "live" ? "green" : "amber"}>{STATUS_LABEL[v.status]}</Badge>
                      </div>
                      <p className="mt-0.5 truncate text-[12.5px] text-dim">{v.tagline}</p>
                      <p className="mt-1 flex items-center gap-1.5 font-mono text-[11px] text-mute">
                        <span style={{ color: c.accent }}>
                          <ChainMark chain={c.mark} size={11} />
                        </span>
                        {c.shortName} · {fmtBps(v.tradeFeeBps)} fee · {v.graduationUsd ? fmtUsd(v.graduationUsd) : "no curve"}
                      </p>
                    </div>
                    <ChevronRight size={15} className="shrink-0 text-mute" />
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {tab === "activity" && (
          <section className="fade-in">
            <Heading title="Activity">Every deployment routed through this aggregator. Mirror legs are listed separately — each is its own contract.</Heading>
            <ActivityList rows={p.launches} />
          </section>
        )}
      </main>

      {tab === "launch" && (
        <div role="region" aria-label="Launch summary and actions" className="actionbar lgx">
          <div className="min-w-0 flex-1">
            <p className="truncate text-[11.5px] text-mute">
              {multi ? `${legs.length} chains` : p.chainInfo.shortName} · {p.pad.name}
            </p>
            <p className="font-mono text-[15px] font-semibold tabular-nums">
              ${usd.toFixed(2)}
              {p.issues.length > 0 && <span className="ml-2 font-sans text-[11.5px] font-medium text-t-amber">{p.issues.length} left</span>}
            </p>
          </div>
          {p.connected ? (
            last ? (
              <Button variant="accent" disabled={!ready} onClick={p.onLaunch} prefix={<Rocket size={15} />} className="min-w-[150px]">
                {multi ? `Launch ${legs.length} chains` : "Launch"}
              </Button>
            ) : (
              <Button
                variant="primary"
                disabled={step === 2 && !ready}
                onClick={() => setStep((s) => Math.min(s + 1, STEPS.length - 1))}
                suffix={<ChevronRight size={15} />}
                className="min-w-[130px]"
              >
                Continue
              </Button>
            )
          ) : (
            <Button variant="primary" onClick={p.onConnect} prefix={<Wallet size={15} />} className="min-w-[150px]">
              Connect
            </Button>
          )}
        </div>
      )}

      <TabBar tab={tab} onChange={setTab} badge={p.launches.length} />
    </div>
  );
}
