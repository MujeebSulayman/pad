"use client";

import { CHAIN, PAD, type Launch, type LaunchStatus } from "@/lib/data";
import { cn, fmtUsd, shortAddr, timeAgo } from "@/lib/format";
import { ArrowUpRight, ChainMark } from "../icons";
import { Badge, TokenAvatar, type Tone } from "../ui";

const STATUS: Record<LaunchStatus, { tone: Tone; label: string }> = {
  success: { tone: "green", label: "Live" },
  pending: { tone: "amber", label: "In review" },
  failed: { tone: "red", label: "Failed" },
};

const MirrorTag = ({ count }: { count: number }) => (
  <span className="rounded-full bg-t-purple/14 px-1.5 py-px font-sans text-[10px] font-semibold text-t-purple">{count}-chain mirror</span>
);

/** Desktop: every deployment routed through the aggregator, newest first. */
export function LaunchesTable({ rows }: { rows: Launch[] }) {
  return (
    <div className="glass overflow-hidden rounded-[30px]" data-lg="surface" data-lg-r="30" data-lg-tint="card">
      <div className="flex items-center justify-between gap-4 px-6 py-5">
        <span className="font-mono text-[12px] uppercase tracking-[0.16em] text-dim">MirrorPad · deployments</span>
        <span className="pill !h-7 font-mono text-[11px]">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-good shadow-[0_0_10px_var(--good)]" />
          {rows.length} launches
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] border-collapse text-left">
          <thead>
            <tr className="border-y border-line">
              {["Token", "Chain", "Venue", "Address", "Market cap", "Status", "Age"].map((h) => (
                <th key={h} className="label px-6 py-2.5 !text-[10.5px]">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => {
              const chain = CHAIN[r.chain];
              const pad = PAD[r.launchpadId];
              const s = STATUS[r.status];
              return (
                <tr key={r.id} className={cn("group transition-colors hover:bg-[color-mix(in_srgb,var(--fg)_4%,transparent)]", i < rows.length - 1 && "border-b border-line", i === 0 && "fade-in")}>
                  <td className="px-6 py-3">
                    <div className="flex items-center gap-3">
                      <TokenAvatar imageUrl={r.imageUrl} symbol={r.symbol} className="h-8 w-8 rounded-[10px] text-[10px]" />
                      <div className="min-w-0">
                        <p className="truncate text-[13.5px] font-semibold">{r.name}</p>
                        <p className="flex items-center gap-1.5 font-mono text-[11px] text-mute">
                          ${r.symbol}
                          {r.mirrorCount && <MirrorTag count={r.mirrorCount} />}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-3">
                    <span className="inline-flex items-center gap-1.5 text-[13px]">
                      <span style={{ color: chain.accent }}>
                        <ChainMark chain={chain.mark} size={13} />
                      </span>
                      {chain.shortName}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-[13px] text-dim">{pad?.name ?? "—"}</td>
                  <td className="px-6 py-3">
                    <a
                      href={`${chain.explorer}/address/${r.mintAddress}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 font-mono text-[11.5px] text-dim hover:text-fg"
                    >
                      {shortAddr(r.mintAddress, 6, 4)}
                      <ArrowUpRight size={11} className="opacity-0 transition-opacity group-hover:opacity-100" />
                    </a>
                  </td>
                  <td className="px-6 py-3 font-mono text-[12.5px] tabular-nums">{r.marketCapUsd ? fmtUsd(r.marketCapUsd) : "—"}</td>
                  <td className="px-6 py-3">
                    <Badge tone={s.tone} dot={r.status === "success"}>
                      {s.label}
                    </Badge>
                  </td>
                  <td className="px-6 py-3 font-mono text-[12px] tabular-nums text-mute" suppressHydrationWarning>
                    {timeAgo(r.createdAt)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/** Phones: the same feed as a list of cards. */
export function ActivityList({ rows }: { rows: Launch[] }) {
  return (
    <div className="flex flex-col gap-2.5">
      {rows.map((r) => {
        const chain = CHAIN[r.chain];
        const pad = PAD[r.launchpadId];
        const s = STATUS[r.status];
        return (
          <a
            key={r.id}
            href={`${chain.explorer}/address/${r.mintAddress}`}
            target="_blank"
            rel="noreferrer"
            className="tile flex items-center gap-3 rounded-[22px] p-3.5"
          >
            <TokenAvatar imageUrl={r.imageUrl} symbol={r.symbol} className="h-12 w-12 rounded-[15px] text-[13px]" />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="truncate text-[14.5px] font-semibold">{r.name}</p>
                <span className="shrink-0 font-mono text-[11px] text-mute">${r.symbol}</span>
              </div>
              <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-[12px] text-dim">
                <span style={{ color: chain.accent }}>
                  <ChainMark chain={chain.mark} size={11} />
                </span>
                {chain.shortName} · {pad?.name ?? "—"}
                {r.mirrorCount && <MirrorTag count={r.mirrorCount} />}
              </p>
              <p className="mt-1 font-mono text-[11px] text-mute" suppressHydrationWarning>
                {shortAddr(r.mintAddress, 6, 4)} · {timeAgo(r.createdAt)}
              </p>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-1.5">
              <Badge tone={s.tone} dot={r.status === "success"}>
                {s.label}
              </Badge>
              <span className="font-mono text-[12.5px] tabular-nums">{r.marketCapUsd ? fmtUsd(r.marketCapUsd) : "—"}</span>
              <ArrowUpRight size={12} className="text-mute" />
            </div>
          </a>
        );
      })}
    </div>
  );
}
