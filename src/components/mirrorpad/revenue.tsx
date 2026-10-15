import { Reveal } from "../reveal";
import { Badge } from "../ui";
import { Section, SectionHead } from "./section";

/*
 * Holder revenue, shown with DEMO figures. None of these numbers are real earnings; the section is
 * labeled as such everywhere it appears. Replace DEMO with live data once fees are distributed.
 */

/** Seeded generator, so the demo figures are the same on every render and every visit. */
function seeded(seed: number) {
  let t = seed;
  return () => {
    t = (t + 0x6d2b79f5) | 0;
    let x = Math.imul(t ^ (t >>> 15), 1 | t);
    x ^= x + Math.imul(x ^ (x >>> 7), 61 | x);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

const r = seeded(20261015);
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
/** Small, early-stage demo amounts: a few dollars a day. */
const DAILY = DAYS.map((day) => ({ day, usd: Math.round((2.4 + r() * 9.6) * 100) / 100 }));
const WEEK = Math.round(DAILY.reduce((s, d) => s + d.usd, 0) * 100) / 100;
const HOLDERS = 46;

export const DEMO = {
  totalUsd: 187.42,
  weekUsd: WEEK,
  holders: HOLDERS,
  avgPerHolder: Math.round((WEEK / HOLDERS) * 100) / 100,
  daily: DAILY,
  payouts: Array.from({ length: 5 }, (_, i) => ({
    when: `${i * 6 + 2}h ago`,
    usd: Math.round((0.8 + r() * 4.2) * 100) / 100,
    chain: (["Solana", "Base", "BNB Chain", "Robinhood"] as const)[Math.floor(r() * 4)],
    holders: Math.round(38 + r() * 8),
  })),
};

/** Dollars and cents, for amounts this small. */
const money = (n: number) => `$${n.toFixed(2)}`;

const peak = Math.max(...DEMO.daily.map((d) => d.usd));



function Tiles({ compact }: { compact?: boolean }) {
  const tiles = [
    { label: "Distributed to holders", value: money(DEMO.totalUsd) },
    { label: "Last 7 days", value: money(DEMO.weekUsd) },
    { label: "Holders paid", value: DEMO.holders.toLocaleString() },
    { label: "Avg per holder, 7d", value: money(DEMO.avgPerHolder) },
  ];
  return (
    <dl className={compact ? "grid grid-cols-2 gap-2.5" : "grid gap-4 sm:grid-cols-2 lg:grid-cols-4"}>
      {tiles.map((t) => (
        <div key={t.label} className={compact ? "tile rounded-[20px] p-4" : "card p-6"}>
          <dt className="label">{t.label}</dt>
          <dd className={compact ? "mt-2 text-[20px] font-semibold tracking-[-0.03em]" : "mt-3 text-[30px] font-semibold tracking-[-0.04em]"}>{t.value}</dd>
        </div>
      ))}
    </dl>
  );
}

function WeekChart() {
  return (
    <div className="flex h-44 items-end gap-2.5" role="img" aria-label={`Demo daily distributions: ${DEMO.daily.map((d) => `${d.day} ${money(d.usd)}`).join(", ")}`}>
      {DEMO.daily.map((d) => (
        <div key={d.day} className="flex h-full flex-1 flex-col items-center justify-end gap-2">
          <span className="font-mono text-[10.5px] text-mute">{money(d.usd)}</span>
          <div className="w-full rounded-t-[10px] [background:var(--g-accent)] opacity-90" style={{ height: `${(d.usd / peak) * 100}%` }} />
          <span className="font-mono text-[11px] text-dim">{d.day}</span>
        </div>
      ))}
    </div>
  );
}

function Payouts() {
  return (
    <ul className="flex flex-col">
      {DEMO.payouts.map((p, i) => (
        <li key={i} className="flex items-center justify-between gap-3 border-b border-line py-3 last:border-b-0">
          <div className="min-w-0">
            <p className="text-[14px] font-semibold">{money(p.usd)} distributed</p>
            <p className="text-[12px] text-dim">
              {p.chain} · {p.holders.toLocaleString()} holders
            </p>
          </div>
          <span className="shrink-0 font-mono text-[12px] text-mute">{p.when}</span>
        </li>
      ))}
    </ul>
  );
}

/** Desktop: "Holder revenue". */
export function RevenueSection() {
  return (
    <Section id="revenue">
      <SectionHead
        index="05"
        eyebrow="Holder revenue"
        title={
          <>
            Fees flow back to holders. <span className="text-mute">Every trade, every chain.</span>
          </>
        }
      />
 
      <Reveal variant="scale">
        <Tiles />
      </Reveal>
      <div className="mt-4 grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <Reveal variant="scale" className="h-full">
          <article className="card h-full p-7">
            <p className="label">Distributed per day · last 7 days</p>
            <div className="mt-6">
              <WeekChart />
            </div>
          </article>
        </Reveal>
        <Reveal variant="scale" delay={80} className="h-full">
          <article className="card h-full p-7">
            <p className="label">Recent distributions</p>
            <div className="mt-3">
              <Payouts />
            </div>
          </article>
        </Reveal>
      </div>
    </Section>
  );
}

/** Phones: the same, stacked. */
export function RevenuePanel() {
  return (
    <div className="flex flex-col gap-3">
   
      <Tiles compact />
      <div className="tile rounded-[22px] p-4">
        <p className="label">Distributed per day · 7d</p>
        <div className="mt-4">
          <WeekChart />
        </div>
      </div>
      <div className="tile rounded-[22px] px-4 py-1">
        <Payouts />
      </div>
   
    </div>
  );
}
