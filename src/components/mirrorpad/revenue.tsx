import { Reveal } from "../reveal";
import { Section, SectionHead } from "./section";

/*
 * Holder revenue. Distributions haven't started, so every figure is $0. When they do, replace
 * REVENUE with live data (e.g. read from the treasury and the payout transactions).
 */

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export const REVENUE = {
  totalUsd: 0,
  weekUsd: 0,
  holders: 0,
  avgPerHolder: 0,
  daily: DAYS.map((day) => ({ day, usd: 0 })),
  payouts: [] as { when: string; usd: number; chain: string; holders: number }[],
};

const money = (n: number) => `$${n.toFixed(2)}`;
const peak = Math.max(...REVENUE.daily.map((d) => d.usd));

function Tiles({ compact }: { compact?: boolean }) {
  const tiles = [
    { label: "Distributed to holders", value: money(REVENUE.totalUsd) },
    { label: "Last 7 days", value: money(REVENUE.weekUsd) },
    { label: "Holders paid", value: REVENUE.holders.toLocaleString() },
    { label: "Avg per holder, 7d", value: money(REVENUE.avgPerHolder) },
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
    <div className="flex h-44 items-end gap-2.5" role="img" aria-label={`Daily distributions: ${REVENUE.daily.map((d) => `${d.day} ${money(d.usd)}`).join(", ")}`}>
      {REVENUE.daily.map((d) => (
        <div key={d.day} className="flex h-full flex-1 flex-col items-center justify-end gap-2">
          <span className="font-mono text-[10.5px] text-mute">{money(d.usd)}</span>
          {/* A 2px floor keeps an empty week visible as a baseline instead of collapsing. */}
          <div className="w-full rounded-t-[10px] [background:var(--g-accent)] opacity-90" style={{ height: peak > 0 ? `max(2px, ${(d.usd / peak) * 100}%)` : "2px" }} />
          <span className="font-mono text-[11px] text-dim">{d.day}</span>
        </div>
      ))}
    </div>
  );
}

function Payouts() {
  if (REVENUE.payouts.length === 0) {
    return <p className="py-6 text-center text-[13.5px] text-dim">No distributions yet.</p>;
  }
  return (
    <ul className="flex flex-col">
      {REVENUE.payouts.map((p, i) => (
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
