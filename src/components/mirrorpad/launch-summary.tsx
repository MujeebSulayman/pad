"use client";

import { CHAIN, STATUS_LABEL, type Draft, type Launchpad, type Mirrors } from "@/lib/data";
import { cn, fmtBps, fmtUsd } from "@/lib/format";
import { costLegs, devBuyOf, gasFor, totalUsd } from "@/lib/launch";
import { usePrices } from "../use-prices";
import { useWallet } from "../wallet/context";
import { Alert, Bolt, ChainMark, Receipt, Rocket, Wallet } from "../icons";
import { Badge, Button, Notice, Row, TokenAvatar } from "../ui";
import type { Balance } from "../wallet/use-balance";

/** The live preview of the token as the venue will show it. */
export function TokenPreview({ pad, draft, mirrorCount = 0, className }: { pad: Launchpad; draft: Draft; mirrorCount?: number; className?: string }) {
  const chain = CHAIN[pad.chain];
  return (
    <div className={cn("card overflow-hidden !rounded-[26px] p-4", className)}>
      <div className="flex items-center gap-3.5">
        <div className="relative isolate shrink-0">
          <span
            aria-hidden
            className="absolute -inset-3 -z-10 rounded-full blur-xl transition-colors duration-500"
            style={{ background: `color-mix(in srgb, ${chain.accent} 35%, transparent)` }}
          />
          <TokenAvatar imageUrl={draft.imageUrl} symbol={draft.symbol} className="h-14 w-14 rounded-[18px] text-[16px] font-medium" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <h3 className="truncate text-[17px] font-semibold tracking-[-0.02em]">{draft.name || "Untitled token"}</h3>
            <span className="shrink-0 font-mono text-[12px] text-mute">${draft.symbol || "———"}</span>
          </div>
          <p className="mt-0.5 flex items-center gap-1.5 font-mono text-[11px] text-mute">
            <span style={{ color: chain.accent }}>
              <ChainMark chain={chain.mark} size={11} />
            </span>
            {chain.shortName} · {pad.name}
          </p>
        </div>
      </div>
      <p className="mt-3.5 line-clamp-2 min-h-[36px] text-[13px] leading-[18px] text-dim">{draft.description || "No description yet."}</p>
      <div className="mt-3.5 flex flex-wrap items-center gap-1.5">
        <Badge tone={pad.status === "live" ? "green" : "amber"} dot={pad.status === "live"}>
          {STATUS_LABEL[pad.status]}
        </Badge>
        <Badge tone="blue">{pad.curve}</Badge>
        {mirrorCount > 0 && <Badge tone="purple">+{mirrorCount} mirrors</Badge>}
      </div>
    </div>
  );
}

/** Desktop aside: preview, the run as a receipt, blockers and the launch button. */
export function LaunchSummary({
  pad,
  draft,
  issues,
  mirrors,
  connected,
  balance,
  onConnect,
  onLaunch,
}: {
  pad: Launchpad;
  draft: Draft;
  issues: string[];
  mirrors: Mirrors;
  connected: boolean;
  /** Live wallet balance on the primary chain; omitted for the simulated wallet. */
  balance?: Balance;
  onConnect: () => void;
  onLaunch: () => void;
}) {
  const chain = CHAIN[pad.chain];

  const ready = issues.length === 0;
  const prices = usePrices();
  const { signer } = useWallet();
  const price = prices[chain.nativeToken] ?? 0;
  const legs = costLegs(pad, draft, mirrors, prices);
  const multi = legs.length > 1;
  const devBuy = devBuyOf(pad, draft);
  const gas = gasFor(pad.chain);
  const total = pad.createFee + devBuy + gas;
  const usd = totalUsd(legs);

  return (
    <div className="flex flex-col gap-3.5">
      <TokenPreview pad={pad} draft={draft} mirrorCount={legs.length - 1} />

      <div className="glass rounded-[28px]" data-lg="surface" data-lg-r="28" data-lg-tint="card">
        <div className="flex items-center justify-between border-b border-dashed border-line2 px-5 py-4">
          <span className="font-mono text-[11.5px] uppercase tracking-[0.16em] text-dim">Launch receipt</span>
          <Receipt size={17} className="text-accent" />
        </div>

        <div className="px-5 py-3.5">
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
                    {l.mirror && <span className="font-mono text-[9.5px] uppercase tracking-[0.1em] text-mute">shadow</span>}
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

          <div className="mt-3 border-t border-line pt-2.5">
            {multi && <p className="label pb-1">Primary venue · {pad.name}</p>}
            <Row label="Trading fee" value={fmtBps(pad.tradeFeeBps)} />
            <Row label="Your fee share" value={pad.creatorRevBps ? fmtBps(pad.creatorRevBps) : "None"} muted={!pad.creatorRevBps} />
            <Row label="Graduates at" value={pad.graduationUsd ? fmtUsd(pad.graduationUsd) : "No curve"} muted={!pad.graduationUsd} />
            <Row label="Liquidity lands in" value={pad.liquidityDest} />
            {connected && balance && (balance.value !== null || balance.loading || balance.error) && (
              <Row
                label="Your balance"
                muted={balance.value === null}
                value={
                  balance.value !== null ? (
                    <span className={balance.value < total ? "text-t-amber" : undefined}>
                      {balance.value.toFixed(4)} {chain.nativeToken}
                    </span>
                  ) : balance.error ? (
                    "RPC unavailable"
                  ) : (
                    "…"
                  )
                }
              />
            )}
          </div>
        </div>

        <div className="flex items-baseline justify-between gap-3 border-t border-dashed border-line2 px-5 py-4">
          <span className="font-mono text-[11.5px] uppercase tracking-[0.14em] text-dim">{multi ? `Total · ${legs.length} chains` : "Total"}</span>
          <span className="text-right">
            <span className="block font-mono text-[20px] font-semibold tabular-nums text-accent">${usd.toFixed(2)}</span>
            <span className="block font-mono text-[11px] text-mute">
              {multi ? `${legs.length} signatures` : `${total.toFixed(5)} ${chain.nativeToken}`} · 1 {chain.nativeToken} ≈ ${price.toLocaleString()}
            </span>
          </span>
        </div>
      </div>

      {issues.length > 0 && (
        <Notice tone="amber" icon={<Alert size={14} />}>
          <p className="font-semibold">
            {issues.length} item{issues.length === 1 ? "" : "s"} left
          </p>
          <ul className="mt-1 space-y-0.5 opacity-90">
            {issues.map((i) => (
              <li key={i}>· {i}</li>
            ))}
          </ul>
        </Notice>
      )}

      {pad.status === "beta" && (
        <Notice tone="blue" icon={<Bolt size={14} />}>
          This adapter is in beta. Verify the deployment on the explorer before promoting it.
        </Notice>
      )}

      {connected ? (
        <Button variant="accent" size="lg" full disabled={!ready} onClick={onLaunch} prefix={<Rocket size={16} />}>
          {multi ? `Launch on ${legs.length} chains` : `Launch on ${pad.name}`}
        </Button>
      ) : (
        <Button variant="primary" size="lg" full onClick={onConnect} prefix={<Wallet size={16} />}>
          Connect wallet to continue
        </Button>
      )}
      <p className="px-2 text-center text-[11.5px] leading-[16px] text-mute">
        {signer
          ? "Real mainnet transactions, signed by your wallet. Venue fees and thresholds shown here are estimates; the venue's own terms apply."
          : "Simulated deployments. Fees, curve parameters and thresholds are editable defaults, not live quotes from each venue."}
      </p>
    </div>
  );
}
