"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { CHAINS, LAUNCHPADS, padsOn } from "@/lib/data";
import { shortAddr } from "@/lib/format";
import { Bolt, Check, ChevronDown, Grid, Layers, Logo, Rocket, Shield, Wallet } from "../icons";
import { ThemeToggle } from "../theme";
import { Button } from "../ui";
import { ChainPicker } from "./chain-picker";
import { LaunchesTable } from "./launches";
import { LaunchpadPicker } from "./launchpad-picker";
import { LaunchSummary } from "./launch-summary";
import { MirrorDiagram } from "./mirror-diagram";
import { MirrorPicker } from "./mirror-picker";
import { TokenForm } from "./token-form";
import type { ViewProps } from "./types";
import { useDrop } from "./use-drop";

const NAV = [
  { id: "launch", label: "Launch", icon: Rocket },
  { id: "venues", label: "Venues", icon: Grid },
  { id: "activity", label: "Activity", icon: Layers },
];

function Header({ connected, address, onConnect, onDisconnect }: Pick<ViewProps, "connected" | "address" | "onConnect" | "onDisconnect">) {
  const [current, setCurrent] = useState("launch");
  const drop = useDrop("nav", current);

  return (
    <header className="topnav nav lgx" id="nav">
      <Link href="/" className="flex shrink-0 items-center gap-2.5" aria-label="MirrorPad home">
        <Logo size={30} />
        <span className="text-[16px] font-semibold tracking-[-0.02em]">MirrorPad</span>
        <span className="hidden rounded-full bg-[var(--steel)] px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.1em] text-dim shadow-[inset_0_1px_0_var(--rim)] xl:inline">
          Aggregator
        </span>
      </Link>
      <nav className="nav-links" aria-label="Main" ref={drop.host} onPointerLeave={drop.leave}>
        <span className="drop" ref={drop.drop} aria-hidden />
        {NAV.map((n) => (
          <a key={n.id} href={`#${n.id}`} aria-current={current === n.id ? "page" : undefined} onPointerEnter={drop.enter} onClick={() => setCurrent(n.id)}>
            <n.icon size={16} />
            {n.label}
          </a>
        ))}
      </nav>
      <div className="flex shrink-0 items-center gap-2">
        <ThemeToggle />
        {connected ? (
          <button onClick={onDisconnect} className="btn btn-sm btn-ghost !h-10 !gap-2 !pl-2.5" title="Disconnect">
            <span className="grid h-5 w-5 place-items-center rounded-full bg-good text-[var(--accent-ink)]">
              <Check size={11} strokeWidth={2.4} />
            </span>
            <span className="font-mono text-[12.5px]">{shortAddr(address, 5, 4)}</span>
            <ChevronDown size={13} className="text-mute" />
          </button>
        ) : (
          <Button variant="primary" size="sm" className="!h-10" prefix={<Wallet size={15} />} onClick={onConnect}>
            Connect
          </Button>
        )}
      </div>
    </header>
  );
}

function SectionHead({ n, title, subtitle, id }: { n: number; title: string; subtitle: ReactNode; id?: string }) {
  return (
    <div id={id} className="mb-5 flex scroll-mt-[110px] items-start gap-4">
      <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[var(--knob)] font-mono text-[13px] font-medium shadow-[var(--edge-sm)]">{n}</span>
      <div>
        <h2 className="text-[26px] leading-tight">{title}</h2>
        <p className="mt-1 text-[14px] leading-[20px] text-dim">{subtitle}</p>
      </div>
    </div>
  );
}

const STATS = [
  { icon: Layers, label: "Venues wired", value: String(LAUNCHPADS.length) },
  { icon: Grid, label: "Chains", value: String(CHAINS.length) },
  { icon: Bolt, label: "Mirrored per run", value: "Up to 4" },
  { icon: Shield, label: "Sim before sign", value: "Always" },
];

export function DesktopView(p: ViewProps) {
  return (
    <div className="hidden lg:block">
      <Header connected={p.connected} address={p.address} onConnect={p.onConnect} onDisconnect={p.onDisconnect} />

      <main className="relative pt-[calc(var(--nav-h)+16px)]">
        {/* Hero */}
        <section id="launch" className="relative">
          <div className="grid-bg pointer-events-none absolute inset-0" aria-hidden />
          <div className="page-shell relative grid items-center gap-10 py-16 lg:grid-cols-[1.1fr_1fr] xl:py-20">
            <div className="min-w-0">
              <span className="rise pill">
                <span className="rounded-full [background:var(--g-accent)] px-2 py-0.5 text-[10.5px] font-bold text-[var(--accent-ink)]">New</span>
                Mirror launches — one token, up to four chains
              </span>
              <h1 className="display rise mt-7 text-[clamp(48px,5.6vw,80px)]" style={{ animationDelay: "80ms" }}>
                Launch once.
                <br />
                Mirror <span className="text-gradient">everywhere.</span>
              </h1>
              <p className="rise mt-6 max-w-[52ch] text-[17px] leading-relaxed text-dim" style={{ animationDelay: "160ms" }}>
                Write your token metadata once, then deploy it through the venue that fits — or mirror the same token onto Robinhood, Solana, Base and BNB
                Chain in a single run. Fees, curves and graduation thresholds compared side by side before you sign.
              </p>
              <dl className="rise mt-10 grid max-w-[600px] grid-cols-4 gap-3" style={{ animationDelay: "240ms" }}>
                {STATS.map((s) => (
                  <div key={s.label} className="card-2 px-4 py-3.5">
                    <dt className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.1em] text-mute">
                      <s.icon size={13} className="text-accent" />
                      {s.label}
                    </dt>
                    <dd className="mt-1.5 text-[22px] font-semibold tracking-[-0.03em]">{s.value}</dd>
                  </div>
                ))}
              </dl>
            </div>
            <div className="rise flex justify-center lg:justify-end" style={{ animationDelay: "200ms" }}>
              <MirrorDiagram chain={p.chain} padId={p.padId} mirrors={p.mirrors} draft={p.draft} />
            </div>
          </div>
        </section>

        <div className="page-shell pb-16 pt-6">
          <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_380px]">
            <div className="min-w-0">
              <section>
                <SectionHead n={1} title="Pick a primary chain" subtitle={p.chainInfo.note} />
                <ChainPicker value={p.chain} onChange={p.onSelectChain} />
              </section>

              <section className="mt-14">
                <SectionHead
                  n={2}
                  id="venues"
                  title="Pick a launchpad"
                  subtitle={
                    p.scope === "chain"
                      ? `${padsOn(p.chain).length} venues on ${p.chainInfo.name}. Select one to see its full terms.`
                      : `Comparing all ${LAUNCHPADS.length} venues across every chain.`
                  }
                />
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

              <section className="mt-14">
                <SectionHead
                  n={3}
                  title="Configure the token"
                  subtitle="This metadata is what every mirror copies. The extra fields below are specific to the venue you picked."
                />
                <div className="glass rounded-[30px] p-6" data-lg="surface" data-lg-r="30" data-lg-tint="card">
                  <TokenForm pad={p.pad} draft={p.draft} errors={p.errors} onChange={p.onDraftChange} />
                </div>
              </section>

              <section className="mt-14">
                <SectionHead n={4} title="Mirror to other chains" subtitle="Optional. Deploy the same token on the other three chains in the same run, each with its own venue." />
                <MirrorPicker primaryChain={p.chain} mirrors={p.mirrors} onChange={p.onMirrorsChange} />
              </section>
            </div>

            <aside className="lg:sticky lg:top-[calc(var(--nav-h)+32px)] lg:h-fit">
              <LaunchSummary
                pad={p.pad}
                draft={p.draft}
                issues={p.issues}
                mirrors={p.mirrors}
                connected={p.connected}
                onConnect={p.onConnect}
                onLaunch={p.onLaunch}
              />
            </aside>
          </div>

          <section id="activity" className="mt-20 scroll-mt-[110px]">
            <LaunchesTable rows={p.launches} />
          </section>
        </div>

        <footer className="border-t border-line">
          <div className="page-shell flex items-center justify-between gap-6 py-8">
            <div className="flex items-center gap-3">
              <Logo size={24} />
              <p className="max-w-[70ch] text-[13px] text-dim">
                MirrorPad — a launchpad aggregator demo. Mirrors are independent deployments, not bridged tokens. No real transactions are broadcast.
              </p>
            </div>
            <div className="flex shrink-0 flex-wrap gap-5">
              {["Status", "Changelog", "Terms", "GitHub"].map((l) => (
                <a key={l} href="#" className="text-[13px] text-mute transition-colors hover:text-fg">
                  {l}
                </a>
              ))}
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}
