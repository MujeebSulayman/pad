"use client";

import { useEffect, useState } from "react";
import { CHAINS, LAUNCHPADS } from "@/lib/data";
import { PRIVY_APP_ID } from "@/lib/env";
import { cn } from "@/lib/format";
import { ArrowRight, ChevronDown, Grid, Help, Layers, Logo, Rocket, Wordmark, Sparkles, TelegramLogo, Wallet } from "../icons";
import { LifeCanvas } from "../life-canvas";
import { Reveal } from "../reveal";
import { ThemeButton } from "../theme";
import { WalletButton } from "../wallet/wallet-menu";
import { Button } from "../ui";
import { Section } from "./section";
import type { ViewProps } from "./types";
import { useDrop } from "./use-drop";

const NAV = [
  { id: "studio", label: "Studio", icon: Rocket },
  { id: "venues", label: "Venues", icon: Grid },
  { id: "how", label: "How it works", icon: Sparkles },
  { id: "activity", label: "Activity", icon: Layers },
  { id: "faq", label: "FAQ", icon: Help },
];

/** The nav section whose top most recently crossed the upper third of the viewport. */
function useScrollSpy(ids: string[]) {
  const [current, setCurrent] = useState<string>("");
  useEffect(() => {
    const onScroll = () => {
      const line = window.innerHeight / 3;
      let hit = "";
      for (const id of ids) {
        const el = document.getElementById(id);
        if (el && el.getBoundingClientRect().top <= line) hit = id;
      }
      setCurrent(hit);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return current;
}

/** Desktop: the floating liquid-glass bar, its highlight following the section you're reading. */
export function DesktopHeader({
  walletReady,
  connected,
  address,
  onConnect,
  onDisconnect,
}: Pick<ViewProps, "walletReady" | "connected" | "address" | "onConnect" | "onDisconnect">) {
  const current = useScrollSpy(NAV.map((n) => n.id));
  const drop = useDrop("nav", current);

  return (
    <header className="topnav nav lgx" id="nav">
      <a href="#top" aria-label="ShadowPad home" className="flex shrink-0 items-center gap-2.5 transition-transform duration-700 [transition-timing-function:var(--ease-spring)] hover:scale-105">
        <Logo size={32} />
        <Wordmark height={19} />
      </a>
      <nav className="nav-links" aria-label="Main" ref={drop.host} onPointerLeave={drop.leave}>
        <span className="drop" ref={drop.drop} aria-hidden />
        {NAV.map((n) => (
          <a key={n.id} href={`#${n.id}`} aria-current={current === n.id ? "page" : undefined} onPointerEnter={drop.enter}>
            <n.icon size={16} strokeWidth={current === n.id ? 1.9 : 1.5} />
            {n.label}
          </a>
        ))}
      </nav>
      <div className="flex shrink-0 items-center gap-1.5">
        <ThemeButton />
        {connected ? (
          <WalletButton address={address} onDisconnect={onDisconnect} />
        ) : (
          <Button variant="secondary" size="sm" className="!h-10" prefix={<Wallet size={15} />} loading={!walletReady} onClick={onConnect}>
            Connect
          </Button>
        )}
        <a href="#studio" className="btn btn-sm btn-accent !h-10">
          <Rocket size={15} strokeWidth={1.9} />
          Launch
        </a>
      </div>
    </header>
  );
}

const FAQS: [string, string][] = [
  [
    "What is ShadowPad?",
    `A launchpad aggregator. Write your token metadata once, then deploy it through any of ${LAUNCHPADS.length} venues on Robinhood, Solana, Base or BNB Chain — or shadow it across all four in one run.`,
  ],
  ["Is a shadow a bridged token?", "No. Each chain gets its own contract and its own liquidity. Shadows share a name, symbol, description and image — supply is not shared."],
  ["How many times do I sign?", "At least once per chain in the run. Some venues add a step: Four.meme asks for a login signature, and Bags has a fee-share config transaction before the launch."],
  [
    "Will my token be listed in the Robinhood app or on Binance Alpha?",
    "Not automatically. Robinhood Issuance and BSC Issuance deploy your token on-chain with the issuer details on record, which is what those programs look for, but app and exchange listings are decided by Robinhood and Binance.",
  ],
  ["Are the fees live quotes?", "No. Fees, curve parameters and graduation thresholds are editable defaults, not live quotes from each venue. Check the venue before you rely on them."],
  [
    "Does anything hit mainnet?",
    PRIVY_APP_ID
      ? "Yes. Once you sign in, every launch is a real mainnet transaction signed by your own wallet, and it's live as soon as it confirms."
      : "Not in this demo build. Without a wallet provider configured, every run is simulated end to end.",
  ],
];

export function Faq() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <Section id="faq">
      <Reveal className="mb-10">
        <p className="eyebrow">Questions</p>
        <h2 className="h2 mt-3">Before you sign anything.</h2>
      </Reveal>
      <div className="grid gap-3 lg:grid-cols-2 lg:items-start">
        {FAQS.map(([q, a], i) => {
          const on = open === i;
          return (
            <div key={q} className={cn("card overflow-hidden transition-colors duration-500", on && "!bg-fg/[.07]")}>
              <button type="button" className="flex w-full items-center gap-4 px-5 py-4 text-left sm:px-6 sm:py-5" onClick={() => setOpen(on ? null : i)} aria-expanded={on}>
                <span className={cn("font-mono text-[12px] transition-colors", on ? "text-accent" : "text-mute")}>{String(i + 1).padStart(2, "0")}</span>
                <span className="flex-1 text-[16px] font-semibold tracking-[-0.015em]">{q}</span>
                <span
                  className={cn(
                    "grid h-8 w-8 shrink-0 place-items-center rounded-[12px] transition-all duration-500 [transition-timing-function:var(--ease-spring)]",
                    on ? "rotate-180 bg-accent text-[var(--accent-ink)]" : "bg-fg/8",
                  )}
                >
                  <ChevronDown size={16} strokeWidth={2.2} />
                </span>
              </button>
              <div className="grid transition-[grid-template-rows] duration-300 ease-out" style={{ gridTemplateRows: on ? "1fr" : "0fr" }}>
                <div className="overflow-hidden">
                  <p className="pb-5 pl-[52px] pr-5 text-[15px] leading-relaxed text-dim sm:pr-6">{a}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </Section>
  );
}

export function Closing() {
  return (
    <Section>
      <Reveal variant="scale">
        <div className="glass relative grid items-center gap-10 overflow-hidden rounded-[38px] px-6 py-14 sm:px-12 md:grid-cols-[1.2fr_1fr] md:py-16" data-lg="surface" data-lg-r="38" data-lg-tint="card">
          <div>
            <p className="eyebrow">Start here</p>
            <h2 className="display mt-4 text-[clamp(36px,5vw,68px)]">
              Write it once. <span className="text-gradient">Ship it four times.</span>
            </h2>
            <p className="mt-5 max-w-[42ch] text-[17px] text-dim">
              Pick a venue, fill the form, and send the same token to every chain you want, in a single run.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <a href="#studio" className="btn btn-lg btn-white">
                Start a launch
                <ArrowRight size={18} strokeWidth={2} />
              </a>
              <a href="#venues" className="btn btn-lg btn-ghost">
                <Grid size={18} />
                Compare venues
              </a>
            </div>
          </div>
          <div className="mx-auto w-full max-w-[360px] rotate-[-3deg]">
            <div className="card overflow-hidden p-4">
              <div className="flex items-center justify-between px-1">
                <span className="label">Block lattice</span>
                <span className="font-mono text-[11px] text-mute">Game of Life</span>
              </div>
              <div className="inset-panel relative mt-3 h-56 overflow-hidden rounded-[18px]">
                <LifeCanvas />
              </div>
            </div>
          </div>
        </div>
      </Reveal>
    </Section>
  );
}

const COLUMNS = [
  {
    title: "Product",
    links: [
      { href: "#studio", label: "Launch studio" },
      { href: "#venues", label: "Venue fees" },
      { href: "#how", label: "How shadowing works" },
      { href: "#activity", label: "Activity" },
    ],
  },
];

/** Footer social icons. Add X here once its link is known: { href: "https://x.com/…", label: "X", Icon: XLogo }. */
const SOCIALS = [{ href: "https://t.me/Shadowpad_app", label: "Telegram", Icon: TelegramLogo }];

export function Footer() {
  return (
    <footer className="mx-auto mt-24 w-full max-w-[1240px] px-4 pb-8 sm:px-6 lg:mt-32">
      <div className="card overflow-hidden px-6 pt-10 sm:px-10">
        <div className="grid gap-10 md:grid-cols-[1.4fr_1fr_1fr]">
          <div>
            <span className="flex items-center gap-2.5">
              <Logo size={40} />
              <Wordmark height={22} title="ShadowPad" />
            </span>
            <p className="mt-5 max-w-[32ch] text-[20px] font-semibold leading-snug tracking-[-0.03em]">
              One form, {LAUNCHPADS.length} venues, {CHAINS.length} chains. Launch once and shadow everywhere.
            </p>
          </div>
          {COLUMNS.map((c) => (
            <nav key={c.title} aria-label={c.title}>
              <p className="label">{c.title}</p>
              <ul className="mt-4 grid gap-2.5">
                {c.links.map((l) => (
                  <li key={l.label}>
                    <a
                      href={l.href}
                      {...(/^https?:/.test(l.href) && { target: "_blank", rel: "noreferrer" })}
                      className="text-[14.5px] text-dim transition-colors hover:text-fg"
                    >
                      {l.label}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
          <nav aria-label="Community">
            <p className="label">Community</p>
            <ul className="mt-4 flex gap-2.5">
              {SOCIALS.map(({ href, label, Icon }) => (
                <li key={label}>
                  <a
                    href={href}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={label}
                    title={label}
                    className="grid h-11 w-11 place-items-center rounded-full bg-[var(--steel)] text-dim shadow-[inset_0_1px_0_var(--rim)] transition-colors hover:bg-[var(--steel-2)] hover:text-fg"
                  >
                    <Icon size={18} />
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        <div className="mt-10 flex flex-col gap-4 border-t border-line pt-6 md:flex-row md:items-center md:justify-between">
          <p className="max-w-[70ch] text-[13px] text-mute">
            A launchpad aggregator. Shadows are independent deployments, not bridged tokens.{PRIVY_APP_ID ? " Launches are real mainnet transactions signed by your wallet." : " This build is a demo: no real transactions are broadcast."}
          </p>
          <p className="shrink-0 text-[13px] text-mute">© {new Date().getFullYear()} ShadowPad</p>
        </div>

        <p aria-hidden className="pointer-events-none mt-6 -mb-[0.12em] select-none text-center font-display text-[clamp(64px,13vw,190px)] leading-[0.8] tracking-[0.08em] text-fg/[.05]">
          shadowpad
        </p>
      </div>
    </footer>
  );
}
