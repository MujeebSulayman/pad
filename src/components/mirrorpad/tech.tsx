import { CHAINS } from "@/lib/data";
import { FEE_LABEL } from "@/lib/fees";
import { Check, ImageIcon, Layers, Receipt, Shield, Wallet } from "../icons";
import { Reveal } from "../reveal";
import { Section, SectionHead } from "./section";

/** What ShadowPad actually does under the hood. Each line describes the shipped code, not a roadmap. */
export const TECH_POINTS = [
  {
    icon: Wallet,
    title: "Your keys, your tokens",
    line: "Sign in with email or your own wallet. Every launch, trade and withdrawal is signed in your wallet; ShadowPad never holds your keys or your funds.",
  },
  {
    icon: Layers,
    title: "One adapter per venue",
    line: "Each launchpad has an adapter that builds that venue's own create transaction through its official API or SDK, so tokens land on the real Pump.fun, Bags, Zora, Clanker, Flaunch and Four.meme contracts.",
  },
  {
    icon: Shield,
    title: "Checked before you sign",
    line: "Your balance is checked up front and every transaction is simulated or gas-estimated first, so a launch that would fail stops before it costs you anything.",
  },
  {
    icon: ImageIcon,
    title: "Metadata pinned to IPFS",
    line: "Your image and token details are pinned once to IPFS, content-addressed and permanent. Every shadow on every chain points at the same files.",
  },
  {
    icon: Check,
    title: "Verified on-chain",
    line: "A launch only appears in the feed after the server finds its transaction on-chain: confirmed, signed by your wallet, and creating the token you named.",
  },
  {
    icon: Receipt,
    title: "Best-price trading",
    line: `Buy and sell in-app, routed by Jupiter on Solana and 0x on Base, BNB Chain and Robinhood Chain. The ${FEE_LABEL} ShadowPad fee is shown in the quote before you sign.`,
  },
] as const;

/** The stack, as plain facts. */
const STACK = [
  { label: "Chains", value: CHAINS.map((c) => c.shortName).join(" · ") },
  { label: "Wallets", value: "Privy · embedded or your own" },
  { label: "Storage", value: "IPFS via Pinata" },
  { label: "Trading", value: "Jupiter · 0x" },
];

function PointIcon({ icon: Icon }: { icon: (typeof TECH_POINTS)[number]["icon"] }) {
  return (
    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[13px] bg-[var(--knob)] text-accent shadow-[var(--edge-sm)]">
      <Icon size={17} />
    </span>
  );
}

/** Desktop: "Under the hood". */
export function TechSection() {
  return (
    <Section id="tech">
      <SectionHead
        index="04"
        eyebrow="Under the hood"
        title={
          <>
            Real contracts, your signatures. <span className="text-mute">Nothing held on your behalf.</span>
          </>
        }
      />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {TECH_POINTS.map((p, i) => (
          <Reveal key={p.title} delay={(i % 3) * 80} variant="scale" className="h-full">
            <article className="card flex h-full flex-col gap-4 p-7">
              <PointIcon icon={p.icon} />
              <div>
                <h3 className="h3">{p.title}</h3>
                <p className="mt-2 text-[15px] leading-relaxed text-dim">{p.line}</p>
              </div>
            </article>
          </Reveal>
        ))}
      </div>
      <Reveal>
        <dl className="mt-4 grid gap-px overflow-hidden rounded-[24px] bg-line sm:grid-cols-2 lg:grid-cols-4">
          {STACK.map((s) => (
            <div key={s.label} className="bg-[var(--bg)] px-6 py-5">
              <dt className="label">{s.label}</dt>
              <dd className="mt-2 text-[14.5px] font-semibold">{s.value}</dd>
            </div>
          ))}
        </dl>
      </Reveal>
    </Section>
  );
}

/** Phones: the same points as a compact list. */
export function TechList() {
  return (
    <div className="flex flex-col gap-2.5">
      {TECH_POINTS.map((p) => (
        <article key={p.title} className="tile flex gap-3.5 rounded-[22px] p-4">
          <PointIcon icon={p.icon} />
          <div className="min-w-0">
            <h3 className="text-[15px] font-semibold">{p.title}</h3>
            <p className="mt-1 text-[13px] leading-[19px] text-dim">{p.line}</p>
          </div>
        </article>
      ))}
    </div>
  );
}
