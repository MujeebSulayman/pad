"use client";

import { useEffect, useState, type ReactNode } from "react";
import { CHAIN, CHAINS, LAUNCHPADS, STATUS_LABEL, padsOn } from "@/lib/data";
import { cn, fmtBps, fmtUsd } from "@/lib/format";
import { costLegs, totalUsd } from "@/lib/launch";
import { usePrices } from "../use-prices";
import { Alert, ChainMark, ChevronRight, Grid, Layers, Logo, Receipt, Rocket, Wallet } from "../icons";
import { ThemeButton } from "../theme";
import { WalletButton } from "../wallet/wallet-menu";
import { Badge, Button, Notice, Row } from "../ui";
import { ChainPicker } from "./chain-picker";
import { ActivityList } from "./launches";
import { LaunchpadPicker } from "./launchpad-picker";
import { TokenPreview } from "./launch-summary";
import { MirrorPicker } from "./mirror-picker";
import { TokenForm } from "./token-form";
import type { ViewProps } from "./types";
import { useDrop } from "./use-drop";

type Tab = "launch" | "venues" | "activity";

const STEPS = ["Chain", "Venue", "Token", "Mirror"];

/** Floating glass tab bar, with Launch as the accent button in the middle. */
function TabBar({ tab, onChange, badge }: { tab: Tab; onChange: (t: Tab) => void; badge: number }) {
  const drop = useDrop("tab", tab);
  const item = (id: Tab, label: string, Icon: typeof Grid, extra?: ReactNode) => (
    <button onClick={() => onChange(id)} aria-current={id === tab ? "page" : undefined}>
      <span className="relative">
        <Icon size={20} strokeWidth={id === tab ? 1.9 : 1.5} />
        {extra}
      </span>
      <span className="font-medium">{label}</span>
    </button>
  );
  return (
    <nav className="tabbar lgx" id="tabbar" aria-label="Sections" ref={drop.host}>
      <span className="drop" ref={drop.drop} aria-hidden />
      {item("venues", "Venues", Grid)}
      <button
        onClick={() => onChange("launch")}
        aria-label="Launch"
        aria-current={tab === "launch" ? "page" : undefined}
        className="mx-1 !grid h-[52px] w-[52px] !flex-none place-items-center !rounded-[20px] !p-0 !text-[var(--accent-ink)]"
        style={{ background: "var(--g-accent)", boxShadow: "inset 0 1px 0 rgba(255,255,255,.5), 0 10px 24px -10px rgba(150,200,40,.6)" }}
      >
        <Rocket size={22} strokeWidth={1.9} />
      </button>
      {item(
        "activity",
        "Activity",
        Layers,
        !!badge && (
          <span className="absolute -right-2.5 -top-1.5 grid h-[16px] min-w-[16px] place-items-center rounded-full [background:var(--g-accent)] px-1 font-mono text-[9px] font-bold text-[var(--accent-ink)]">
            {badge}
          </span>
        ),
      )}
    </nav>
  );
}

/** Page intro: mono kicker, display title, a line of context. */
function Intro({ kicker, title, children }: { kicker: string; title: ReactNode; children: ReactNode }) {
  return (
    <div className="mb-6">
      <p className="eyebrow">{kicker}</p>
      <h1 className="display mt-4 text-[clamp(32px,9vw,44px)]">{title}</h1>
      <p className="mt-3 text-[15px] leading-[22px] text-dim">{children}</p>
    </div>
  );
}

export function MobileView(p: ViewProps) {
  const [tab, setTab] = useState<Tab>("launch");
  const [step, setStep] = useState(0);
  const legs = costLegs(p.pad, p.draft, p.mirrors, usePrices());
  const multi = legs.length > 1;
  const usd = totalUsd(legs);
  const ready = p.issues.length === 0;
  const last = step === STEPS.length - 1;

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [step, tab]);

  const kicker = `Step ${String(step + 1).padStart(2, "0")} / ${String(STEPS.length).padStart(2, "0")}`;

  return (
    <div className="flex min-h-[100dvh] flex-col lg:hidden">
      <header className="topbar lgx">
        <Logo size={26} />
        <span className="text-[16px] font-semibold tracking-[-0.02em]">ShadowPad</span>
        <div className="ml-auto flex items-center gap-1">
          <ThemeButton />
          {p.connected ? (
            <WalletButton address={p.address} onDisconnect={p.onDisconnect} compact />
          ) : (
            <Button variant="secondary" size="sm" className="!h-10" prefix={<Wallet size={15} />} loading={!p.walletReady} onClick={p.onConnect}>
              Connect
            </Button>
          )}
        </div>
      </header>

      <main className="flex-1 px-4 pb-[calc(var(--mp-nav-h)+var(--mp-action-h)+28px)] pt-[calc(env(safe-area-inset-top,0px)+92px)]">
        {tab === "launch" && (
          <>
            <ol className="mb-8 flex items-center gap-2">
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
                      <span className={cn("font-mono text-[10.5px] uppercase tracking-[0.1em]", current ? "text-fg" : complete ? "text-accent" : "text-mute")}>
                        {String(i + 1).padStart(2, "0")} {s}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ol>

            {step === 0 && (
              <section className="fade-in">
                <Intro
                  kicker={kicker}
                  title={
                    <>
                      Launch once. <span className="text-gradient">Mirror everywhere.</span>
                    </>
                  }
                >
                  Start with a primary chain. {p.chainInfo.note}
                </Intro>
                <ChainPicker value={p.chain} onChange={p.onSelectChain} />
              </section>
            )}

            {step === 1 && (
              <section className="fade-in">
                <Intro kicker={kicker} title="Pick a launchpad">
                  {p.scope === "chain" ? `${padsOn(p.chain).length} venues on ${p.chainInfo.name}.` : `Comparing all ${LAUNCHPADS.length} venues.`}
                </Intro>
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
                <Intro kicker={kicker} title="Configure the token">
                  This metadata is what every mirror copies.
                </Intro>
                <TokenPreview pad={p.pad} draft={p.draft} mirrorCount={legs.length - 1} className="mb-4" />
                <div className="card p-5">
                  <TokenForm pad={p.pad} draft={p.draft} errors={p.errors} onChange={p.onDraftChange} />
                </div>
              </section>
            )}

            {step === 3 && (
              <section className="fade-in">
                <Intro kicker={kicker} title="Mirror to other chains">
                  Optional. Launch on {p.chainInfo.shortName} alone, or deploy the same token across several chains in one run.
                </Intro>
                <MirrorPicker primaryChain={p.chain} mirrors={p.mirrors} onChange={p.onMirrorsChange} />
                <div className="glass mt-4 rounded-[26px]" data-lg="surface" data-lg-r="26" data-lg-tint="card">
                  <div className="flex items-center justify-between border-b border-dashed border-line2 px-5 py-4">
                    <span className="font-mono text-[11.5px] uppercase tracking-[0.16em] text-dim">Launch receipt</span>
                    <Receipt size={17} className="text-accent" />
                  </div>
                  <div className="px-5 py-3">
                    {legs.map((l) => (
                      <Row
                        key={l.pad.id}
                        label={
                          <span className="inline-flex min-w-0 items-center gap-1.5">
                            <span style={{ color: l.chain.accent }}>
                              <ChainMark chain={l.chain.mark} size={12} />
                            </span>
                            <span className="truncate">{l.pad.name}</span>
                            {l.mirror && <span className="font-mono text-[9.5px] uppercase tracking-[0.1em] text-mute">mirror</span>}
                          </span>
                        }
                        value={`${l.native.toFixed(4)} ${l.chain.nativeToken}`}
                      />
                    ))}
                  </div>
                  <div className="flex items-baseline justify-between border-t border-dashed border-line2 px-5 py-4">
                    <span className="font-mono text-[11.5px] uppercase tracking-[0.14em] text-dim">{multi ? `Total · ${legs.length} chains` : "Total"}</span>
                    <span className="font-mono text-[18px] font-semibold tabular-nums text-accent">${usd.toFixed(2)}</span>
                  </div>
                </div>
                {p.pad.status === "beta" && (
                  <div className="mt-3">
                    <Notice tone="blue" icon={<Alert size={14} />}>
                      {p.pad.name} is in beta. Verify the deployment on the explorer before promoting it.
                    </Notice>
                  </div>
                )}
              </section>
            )}
          </>
        )}

        {tab === "venues" && (
          <section className="fade-in">
            <Intro
              kicker="The venues"
              title={
                <>
                  Every fee, <span className="text-mute">side by side.</span>
                </>
              }
            >
              All {LAUNCHPADS.length} launchpads across {CHAINS.length} chains. Tap one to make it your venue.
            </Intro>
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
                      className="grid h-11 w-11 shrink-0 place-items-center rounded-[14px] shadow-[var(--edge-sm)]"
                      style={{ color: c.accent, background: `color-mix(in srgb, ${c.accent} 14%, var(--knob))` }}
                    >
                      <ChainMark chain={c.mark} size={20} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-[14.5px] font-semibold">{v.name}</p>
                        <Badge tone={v.status === "live" ? "green" : "amber"}>{STATUS_LABEL[v.status]}</Badge>
                      </div>
                      <p className="mt-0.5 truncate text-[12.5px] text-dim">{v.tagline}</p>
                      <p className="mt-1 font-mono text-[11px] text-mute">
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
            <Intro
              kicker="Activity"
              title={
                <>
                  Recent launches. <span className="text-mute">Each leg its own contract.</span>
                </>
              }
            >
              Every deployment routed through this aggregator. Mirror legs are listed separately.
            </Intro>
            <ActivityList rows={p.launches} onTrade={p.onTrade} />
          </section>
        )}
      </main>

      {tab === "launch" && (
        <div role="region" aria-label="Launch summary and actions" className="actionbar lgx">
          <div className="min-w-0 flex-1">
            <p className="truncate font-mono text-[10.5px] uppercase tracking-[0.1em] text-mute">
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
            <Button variant="primary" onClick={p.onConnect} loading={!p.walletReady} prefix={<Wallet size={15} />} className="min-w-[150px]">
              Connect
            </Button>
          )}
        </div>
      )}

      <TabBar tab={tab} onChange={setTab} badge={p.launches.length} />
    </div>
  );
}
