"use client";

import { CHAINS, LAUNCHPADS, padsOn } from "@/lib/data";
import { ArrowRight, Grid, Layers, Shield } from "../icons";
import { ChainPicker } from "./chain-picker";
import { LaunchesTable } from "./launches";
import { LaunchpadPicker } from "./launchpad-picker";
import { LaunchSummary } from "./launch-summary";
import { MirrorFlow } from "./mirror-flow";
import { RevenueSection } from "./revenue";
import { TechSection } from "./tech";
import { MirrorPicker } from "./mirror-picker";
import { RunMonitor } from "./run-monitor";
import { Section, SectionHead, StepHead } from "./section";
import { Closing, DesktopHeader, Faq, Footer } from "./site";
import { TokenForm } from "./token-form";
import type { ViewProps } from "./types";
import { VenueReport } from "./venue-report";

const PROMISES = [
  { icon: Layers, text: `${LAUNCHPADS.length} venues, one form` },
  { icon: Grid, text: `${CHAINS.length} chains per run` },
  { icon: Shield, text: "Simulated before you sign" },
];

/** Split hero: the pitch on the left; on the right the run you're building, live. */
function Hero(p: ViewProps) {
  return (
    <section id="top" className="relative">
      <div className="grid-bg pointer-events-none absolute inset-0" aria-hidden />
      <div className="page-shell relative grid min-h-[calc(100vh-100px)] items-center gap-12 lg:grid-cols-[1.1fr_1fr] lg:gap-8">
        <div className="min-w-0">
          

          <h1 className="display rise mt-7 text-[clamp(44px,6.4vw,92px)]" style={{ animationDelay: "80ms" }}>
            Launch once.
            <br />
            Shadow <span className="text-gradient">everywhere.</span>
          </h1>

          <p className="rise mt-7 max-w-[48ch] text-[clamp(16px,1.5vw,19px)] leading-relaxed text-dim" style={{ animationDelay: "160ms" }}>
            Write your token metadata once, then deploy it through the venue that fits — or shadow the same token onto Robinhood, Solana, Base and BNB
            Chain in a single run. Fees, curves and graduation thresholds compared before you sign.
          </p>

          <div className="rise mt-9 flex flex-wrap gap-3" style={{ animationDelay: "240ms" }}>
            <a href="#studio" className="btn btn-lg btn-white">
              Start a launch
              <ArrowRight size={18} strokeWidth={2} />
            </a>
            <a href="#venues" className="btn btn-lg btn-ghost">
              <Grid size={18} />
              Compare venues
            </a>
          </div>

          <ul className="rise mt-10 flex flex-wrap gap-x-6 gap-y-2.5 text-[14px] text-dim" style={{ animationDelay: "320ms" }}>
            {PROMISES.map((x) => (
              <li key={x.text} className="flex items-center gap-2">
                <span className="grid h-7 w-7 place-items-center rounded-[10px] bg-accent/12 text-accent">
                  <x.icon size={15} />
                </span>
                {x.text}
              </li>
            ))}
          </ul>
        </div>

        <div className="rise flex justify-center lg:justify-end" style={{ animationDelay: "200ms" }}>
          <RunMonitor chain={p.chain} pad={p.pad} draft={p.draft} mirrors={p.mirrors} issues={p.issues} onSelectChain={p.onSelectChain} />
        </div>
      </div>
    </section>
  );
}

/** 01: the four builder steps on the left, the receipt following you down on the right. */
function Studio(p: ViewProps) {
  const mirrorCount = Object.keys(p.mirrors).length;
  return (
    <Section id="studio" className="!pt-16 lg:!pt-20">
      <SectionHead
        index="01"
        eyebrow="Launch studio"
        title={
          <>
            Four steps. <span className="text-mute">One signature per chain.</span>
          </>
        }
      />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_390px]">
        <div className="flex min-w-0 flex-col gap-4">
          <article className="card p-6 sm:p-8">
            <StepHead n={1} tag="Chain" title="Pick a primary chain" done>
              {p.chainInfo.note}
            </StepHead>
            <ChainPicker value={p.chain} onChange={p.onSelectChain} />
          </article>

          <article id="studio-venue" className="card scroll-mt-28 p-6 sm:p-8">
            <StepHead n={2} tag="Venue" title="Pick a launchpad" done>
              {p.scope === "chain"
                ? `${padsOn(p.chain).length} venues on ${p.chainInfo.name}. Select one to see its full terms.`
                : `Comparing all ${LAUNCHPADS.length} venues across every chain.`}
            </StepHead>
            <LaunchpadPicker
              chain={p.chain}
              value={p.padId}
              scope={p.scope}
              sort={p.sort}
              onScopeChange={p.onScopeChange}
              onSortChange={p.onSortChange}
              onChange={p.onSelectPad}
            />
          </article>

          <article className="card p-6 sm:p-8">
            <StepHead n={3} tag="Token" title="Configure the token" done={p.issues.length === 0}>
              This metadata is what every shadow copies. The extra fields at the bottom are specific to {p.pad.name}.
            </StepHead>
            <TokenForm pad={p.pad} draft={p.draft} errors={p.errors} onChange={p.onDraftChange} />
          </article>

          <article id="studio-mirror" className="card scroll-mt-28 p-6 sm:p-8">
            <StepHead n={4} tag="Shadow" title="Shadow to other chains" done={mirrorCount > 0}>
              Optional. Deploy the same token on the other three chains in the same run, each through its own venue.
            </StepHead>
            <MirrorPicker primaryChain={p.chain} mirrors={p.mirrors} onChange={p.onMirrorsChange} />
          </article>
        </div>

        <aside className="lg:sticky lg:top-[calc(var(--nav-h)+32px)] lg:h-fit">
          <LaunchSummary
            pad={p.pad}
            draft={p.draft}
            issues={p.issues}
            mirrors={p.mirrors}
            connected={p.connected}
            balance={p.balance}
            onConnect={p.onConnect}
            onLaunch={p.onLaunch}
          />
        </aside>
      </div>
    </Section>
  );
}

export function DesktopView(p: ViewProps) {
  return (
    <div className="hidden lg:block">
      <DesktopHeader walletReady={p.walletReady} connected={p.connected} address={p.address} onConnect={p.onConnect} onDisconnect={p.onDisconnect} />

      <main className="relative pt-[calc(var(--nav-h)+16px)]">
        <Hero {...p} />
        <Studio {...p} />
        <VenueReport padId={p.padId} sort={p.sort} onSortChange={p.onSortChange} onSelectPad={p.onSelectPad} />
        <MirrorFlow chain={p.chain} pad={p.pad} draft={p.draft} mirrors={p.mirrors} />
        <TechSection />
        <RevenueSection />

        <Section id="activity">
          <SectionHead
            index="06"
            eyebrow="Activity"
            title={
              <>
                Recent launches. <span className="text-mute">Each leg is its own contract.</span>
              </>
            }
          />
          <LaunchesTable rows={p.launches} onTrade={p.onTrade} />
        </Section>

        <Faq />
        <Closing />
      </main>
      <Footer />
    </div>
  );
}
