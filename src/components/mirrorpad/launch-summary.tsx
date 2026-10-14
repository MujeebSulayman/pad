"use client";

import { CHAIN, PRICES, STATUS_LABEL, type Draft, type Launchpad, type Mirrors } from "@/lib/data";
import { cn, fmtBps, fmtUsd } from "@/lib/format";
import { costLegs, devBuyOf, gasFor, totalUsd } from "@/lib/launch";
import { Alert, Bolt, ChainMark, Rocket, Wallet } from "../icons";
import { Badge, Button, Notice, Row, TokenAvatar } from "../ui";

/** The live preview of the token as the venue will show it. */
export function TokenPreview({ pad, draft, mirrorCount = 0, className }: { pad: Launchpad; draft: Draft; mirrorCount?: number; className?: string }) {
  const chain = CHAIN[pad.chain];
  return (
    <div className={cn("card overflow-hidden !rounded-[26px]", className)}>
      <div
        className="relative h-[76px]"
        style={{ background: `radial-gradient(120% 140% at 0% 0%, color-mix(in srgb, ${chain.accent} 38%, transparent), transparent 70%)` }}
      >
        <span className="absolute right-3.5 top-3.5 inline-flex items-center gap-1.5 rounded-full bg-[var(--knob)] px-2.5 py-1 text-[11.5px] font-semibold shadow-[var(--edge-sm)]">
          <span style={{ color: chain.accent }}>
            <ChainMark chain={chain.mark} size={12} />
          </span>
          {chain.shortName}
        </span>
      </div>
      <div className="px-5 pb-5">
        <div className="relative z-10 -mt-8">
          <TokenAvatar imageUrl={draft.imageUrl} symbol={draft.symbol} className="h-[60px] w-[60px] rounded-[18px] text-[18px] font-medium ring-4 ring-[var(--bg)]/40" />
        </div>
        <div className="mt-3">
          <div className="flex items-baseline gap-2">
            <h3 className="truncate text-[17px] font-semibold tracking-[-0.02em]">{draft.name || "Untitled token"}</h3>
            <span className="shrink-0 font-mono text-[12px] text-mute">${draft.symbol || "———"}</span>
          </div>
          <p className="mt-1.5 line-clamp-2 min-h-[36px] text-[13px] leading-[18px] text-dim">{draft.description || "No description yet."}</p>
        </div>
        <div className="mt-3.5 flex flex-wrap items-center gap-1.5 border-t border-line pt-3.5">
          <Badge>{pad.name}</Badge>
          <Badge tone={pad.status === "live" ? "green" : "amber"}>{STATUS_LABEL[pad.status]}</Badge>
          <Badge tone="blue">{pad.curve}</Badge>
          {mirrorCount > 0 && <Badge tone="purple">+{mirrorCount} mirrors</Badge>}
        </div>
      </div>
    </div>
  );
}

/** Desktop aside: preview, cost breakdown, blockers and the launch button. */
export function LaunchSummary({
  pad,
  draft,
  issues,
  mirrors,
  connected,
  onConnect,
  onLaunch,
}: {
  pad: Launchpad;
  draft: Draft;
  issues: string[];
  mirrors: Mirrors;
  connected: boolean;
  onConnect: () => void;
  onLaunch: () => void;
}) {
  const chain = CHAIN[pad.chain];
  const price = PRICES[chain.nativeToken] ?? 0;
  const ready = issues.length === 0;
  const legs = costLegs(pad, draft, mirrors);
  const multi = legs.length > 1;
  const devBuy = devBuyOf(pad, draft);
  const gas = gasFor(pad.chain);
  const total = pad.createFee + devBuy + gas;
  const usd = totalUsd(legs);

  return (
    <div className="flex flex-col gap-3.5">
      <TokenPreview pad={pad} draft={draft} mirrorCount={legs.length - 1} />

      <div className="glass rounded-[26px] p-5" data-lg="surface" data-lg-r="26" data-lg-tint="card">
        <div className="flex items-center justify-between">
          <h4 className="label !text-fg">Launch cost</h4>
          <span className="font-mono text-[11px] text-mute">
            1 {chain.nativeToken} ≈ ${price.toLocaleString()}
          </span>
        </div>
        <div className="mt-2.5">
          {multi ? (
            legs.map((l) => (
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
            ))
          ) : (
            <>
              <Row label="Creation fee" value={pad.createFee ? `${pad.createFee} ${chain.nativeToken}` : "Free"} muted={!pad.createFee} />
              {pad.fields.includes("devBuy") && <Row label="Initial dev buy" value={`${devBuy} ${chain.nativeToken}`} muted={!devBuy} />}
              <Row label="Network gas (est.)" value={`${gas} ${chain.nativeToken}`} />
            </>
          )}
          <div className="mt-1.5 border-t border-line pt-1.5">
            <Row
              strong
              label={multi ? `Total across ${legs.length} chains` : "Total"}
              value={multi ? `$${usd.toFixed(2)}` : `${total.toFixed(5)} ${chain.nativeToken} · $${(total * price).toFixed(2)}`}
            />
          </div>
        </div>

        <div className="mt-3 border-t border-line pt-2.5">
          {multi && <p className="label pb-1">Primary venue · {pad.name}</p>}
          <Row label="Trading fee" value={fmtBps(pad.tradeFeeBps)} />
          <Row label="Your fee share" value={pad.creatorRevBps ? fmtBps(pad.creatorRevBps) : "None"} muted={!pad.creatorRevBps} />
          <Row label="Graduates at" value={pad.graduationUsd ? fmtUsd(pad.graduationUsd) : "No curve"} muted={!pad.graduationUsd} />
          <Row label="Liquidity lands in" value={pad.liquidityDest} />
        </div>
      </div>

      {issues.length > 0 && (
        <Notice tone="amber" icon={<Alert size={14} />}>
          <p className="font-semibold">
            {issues.length} item{issues.length === 1 ? "" : "s"} left
          </p>
          <ul className="mt-1 space-y-0.5 opacity-90">
            {issues.slice(0, 4).map((i) => (
              <li key={i}>· {i}</li>
            ))}
          </ul>
        </Notice>
      )}

      {pad.status !== "live" && (
        <Notice tone="blue" icon={<Bolt size={14} />}>
          {pad.status === "approval" || pad.status === "waitlist"
            ? "This venue reviews submissions before they go live. Your launch will be queued as pending rather than trading immediately."
            : "This adapter is in beta. Verify the deployment on the explorer before promoting it."}
        </Notice>
      )}

      {connected ? (
        <Button variant="accent" size="lg" full disabled={!ready} onClick={onLaunch} prefix={<Rocket size={16} />}>
          {multi ? `Launch on ${legs.length} chains` : pad.status === "live" ? `Launch on ${pad.name}` : `Submit to ${pad.name}`}
        </Button>
      ) : (
        <Button variant="primary" size="lg" full onClick={onConnect} prefix={<Wallet size={16} />}>
          Connect wallet to continue
        </Button>
      )}
      <p className="px-2 text-center text-[11.5px] leading-[16px] text-mute">
        Simulated deployments. Fees, curve parameters and thresholds are editable defaults, not live quotes from each venue.
      </p>
    </div>
  );
}
