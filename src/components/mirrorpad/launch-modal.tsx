"use client";

import { useEffect, useState } from "react";
import { CHAIN, type Draft, type Launch, type Launchpad, type Mirrors } from "@/lib/data";
import { cn, shortAddr } from "@/lib/format";
import { buildLegs, buildSteps, isReviewed, stepDuration, type Step } from "@/lib/launch";
import { ArrowUpRight, Alert, ChainMark, Check, Copy } from "../icons";
import { useToast } from "../toast";
import { Badge, Button, Modal, Spinner, TokenAvatar } from "../ui";

/**
 * One launch run: every leg's adapter steps tick through in sequence, then the deployments land
 * in the activity feed. Mount it fresh (with a new key) per run. Closing the modal hides it but
 * the run keeps going in the background.
 */
export function LaunchModal({
  open,
  onClose,
  pad,
  draft,
  mirrors,
  onComplete,
}: {
  open: boolean;
  onClose: () => void;
  pad: Launchpad;
  draft: Draft;
  mirrors: Mirrors;
  onComplete: (launches: Launch[]) => void;
}) {
  const toast = useToast();
  // Snapshot the inputs: edits made while the run is going don't change it.
  const [legs] = useState(() => buildLegs(pad, draft, mirrors));
  const [snap] = useState(() => ({ pad, draft }));
  const [steps, setSteps] = useState<Step[][]>(() => legs.map((l) => buildSteps(l.pad, l.mirror)));
  const [done, setDone] = useState(false);
  const multi = legs.length > 1;

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    const set = (leg: number, step: number, patch: Partial<Step>) =>
      setSteps((all) => all.map((s, i) => (i === leg ? s.map((x, j) => (j === step ? { ...x, ...patch } : x)) : s)));

    let t = 320;
    legs.forEach((leg, li) => {
      steps[li].forEach((step, si) => {
        timers.push(setTimeout(() => set(li, si, { state: "active" }), t));
        t += stepDuration(step.id);
        timers.push(setTimeout(() => set(li, si, { state: "done", hash: step.id === "submit" ? leg.tx : undefined }), t));
        t += 140;
      });
      t += 260;
    });

    timers.push(
      setTimeout(() => {
        setDone(true);
        const { draft: d } = snap;
        const group = `mg-${Date.now()}`;
        onComplete(
          legs.map((l, i) => ({
            id: `${Date.now()}-${i}`,
            launchpadId: l.pad.id,
            chain: l.chain,
            name: d.name,
            symbol: d.symbol,
            imageUrl: d.imageUrl,
            createdAt: Date.now(),
            status: isReviewed(l.pad) ? "pending" : "success",
            txHash: l.tx,
            mintAddress: l.mint,
            marketCapUsd: isReviewed(l.pad) ? 0 : 4200 + 3800 * (Number(d.devBuy) || 0),
            mirrorGroup: multi ? group : undefined,
            mirrorCount: multi ? legs.length : undefined,
          })),
        );
        const anyReview = legs.some((l) => isReviewed(l.pad));
        const first = CHAIN[legs[0].chain];
        toast({
          tone: anyReview ? "info" : "success",
          title: multi ? `${d.symbol} mirrored across ${legs.length} chains` : anyReview ? `${d.symbol} submitted for review` : `${d.symbol} is live`,
          description: multi ? legs.map((l) => CHAIN[l.chain].shortName).join(", ") : `Deployed on ${first.name} via ${legs[0].pad.name}.`,
          action: { label: "View on explorer", href: `${first.explorer}/tx/${legs[0].tx}` },
        });
      }, t + 200),
    );
    return () => timers.forEach(clearTimeout);
    // The run is fixed at mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const copy = (value: string, label: string) => {
    navigator.clipboard?.writeText(value);
    toast({ tone: "success", title: `${label} copied` });
  };

  const { pad: p, draft: d } = snap;
  const first = CHAIN[legs[0].chain];
  const explorerUrl = `${first.explorer}/tx/${legs[0].tx}`;

  const title = done
    ? multi
      ? `Mirrored to ${legs.length} chains`
      : isReviewed(p)
        ? "Submitted for review"
        : "Launch complete"
    : multi
      ? `Mirroring $${d.symbol}`
      : `Launching $${d.symbol}`;

  const description = done
    ? multi
      ? `${d.name} now has an independent deployment on each chain. Liquidity is not shared between them.`
      : isReviewed(p)
        ? `${p.name} has your issuance packet. Status will flip to live once it clears review.`
        : `${d.name} is deployed on ${CHAIN[p.chain].name}.`
    : multi
      ? `Running ${legs.length} adapters — one signature per chain.`
      : `Running the ${p.name} adapter against ${CHAIN[p.chain].network}.`;

  return (
    <Modal
      open={open}
      onClose={onClose}
      wide
      title={title}
      description={description}
      footer={
        done ? (
          <>
            <Button variant="secondary" size="sm" onClick={onClose}>
              Launch another
            </Button>
            <Button variant="primary" size="sm" onClick={() => window.open(explorerUrl, "_blank")} suffix={<ArrowUpRight size={14} />}>
              View on explorer
            </Button>
          </>
        ) : (
          <Button variant="ghost" size="sm" onClick={onClose}>
            Run in background
          </Button>
        )
      }
    >
      <div className="flex flex-col gap-6">
        {legs.map((leg, li) => {
          const chain = CHAIN[leg.chain];
          const ls = steps[li];
          const legDone = ls.every((s) => s.state === "done");
          return (
            <div key={leg.pad.id}>
              {multi && (
                <div className="mb-3.5 flex items-center gap-2.5 border-b border-line pb-2.5">
                  <span className="grid h-7 w-7 place-items-center rounded-[9px] bg-[var(--knob)] shadow-[var(--edge-sm)]" style={{ color: chain.accent }}>
                    <ChainMark chain={chain.mark} size={14} />
                  </span>
                  <p className="text-[14px] font-semibold">
                    {chain.shortName}
                    <span className="ml-1.5 font-normal text-dim">{leg.pad.name}</span>
                  </p>
                  <span className="ml-auto">{leg.mirror ? <Badge tone="blue">Mirror</Badge> : <Badge>Primary</Badge>}</span>
                  {legDone && (
                    <span className="pop text-good">
                      <Check size={15} strokeWidth={2.2} />
                    </span>
                  )}
                </div>
              )}
              <ol className="flex flex-col">
                {ls.map((s, si) => (
                  <li key={s.id} className="flex gap-3.5">
                    <div className="flex flex-col items-center">
                      <span
                        className={cn(
                          "grid h-7 w-7 shrink-0 place-items-center rounded-full transition-all duration-300",
                          s.state === "done" && "[background:var(--g-accent)] text-[var(--accent-ink)] shadow-[0_0_14px_color-mix(in_srgb,var(--accent)_40%,transparent)]",
                          s.state === "active" && "bg-[var(--knob)] text-fg shadow-[var(--edge-sm),inset_0_0_0_1px_var(--accent)]",
                          s.state === "pending" && "bg-[var(--field-bg)] text-mute shadow-[var(--field-in)]",
                          s.state === "error" && "bg-bad text-white",
                        )}
                      >
                        {s.state === "done" ? (
                          <Check size={12} strokeWidth={2.2} />
                        ) : s.state === "active" ? (
                          <Spinner size={12} />
                        ) : s.state === "error" ? (
                          <Alert size={12} />
                        ) : (
                          <span className="font-mono text-[10px]">{si + 1}</span>
                        )}
                      </span>
                      {si < ls.length - 1 && <span className={cn("w-px flex-1 transition-colors duration-500", s.state === "done" ? "bg-accent" : "bg-line2")} />}
                    </div>
                    <div className={cn("min-w-0 flex-1 pt-0.5", si < ls.length - 1 && "pb-4")}>
                      <p className={cn("text-[14px] font-semibold transition-colors", s.state === "pending" ? "text-mute" : "text-fg")}>{s.label}</p>
                      <p className="mt-0.5 text-[12.5px] leading-4 text-dim">{s.detail}</p>
                      {s.hash && (
                        <button
                          onClick={() => copy(s.hash!, "Transaction hash")}
                          className="fade-in mt-2 inline-flex items-center gap-1.5 rounded-full bg-[var(--steel)] px-2.5 py-1 font-mono text-[11px] text-dim shadow-[inset_0_1px_0_var(--rim)] transition-colors hover:text-fg"
                        >
                          {shortAddr(s.hash, 10, 8)}
                          <Copy size={11} />
                        </button>
                      )}
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          );
        })}
      </div>

      {done && (
        <div
          ref={(el) => el?.scrollIntoView({ behavior: "smooth", block: "end" })}
          className="rise mt-6 rounded-[22px] bg-[var(--field-bg)] p-4 shadow-[var(--field-in)]"
        >
          <div className="flex items-center gap-3">
            <TokenAvatar imageUrl={d.imageUrl} symbol={d.symbol} className="h-11 w-11 rounded-[14px] text-[12px]" />
            <div className="min-w-0">
              <p className="text-[15px] font-semibold">
                {d.name} <span className="font-mono text-[12px] font-normal text-mute">${d.symbol}</span>
              </p>
              <p className="text-[12.5px] text-dim">{legs.length === 1 ? `${first.name} · ${legs[0].pad.name}` : `${legs.length} independent deployments`}</p>
            </div>
          </div>
          <div className="mt-3.5 flex flex-col gap-3.5 border-t border-line pt-3.5">
            {legs.map((leg) => {
              const chain = CHAIN[leg.chain];
              return (
                <div key={leg.pad.id}>
                  <p className="flex items-center gap-1.5 text-[11.5px] text-dim">
                    <span style={{ color: chain.accent }}>
                      <ChainMark chain={chain.mark} size={11} />
                    </span>
                    <span className="font-semibold text-fg">{chain.shortName}</span>· {leg.pad.name}
                    {isReviewed(leg.pad) && <span className="text-t-amber">· in review</span>}
                  </p>
                  <div className="mt-1.5 grid gap-2 sm:grid-cols-2">
                    {[
                      { label: leg.chain === "solana" ? "Mint address" : "Contract", value: leg.mint },
                      { label: "Transaction", value: leg.tx },
                    ].map((x) => (
                      <button
                        key={x.label}
                        onClick={() => copy(x.value, x.label)}
                        className="flex w-full items-center justify-between gap-2 rounded-full bg-[var(--steel)] px-3.5 py-2 font-mono text-[11.5px] shadow-[inset_0_1px_0_var(--rim)] transition-colors hover:bg-[var(--steel-2)]"
                      >
                        <span className="truncate">{shortAddr(x.value, 12, 8)}</span>
                        <Copy size={12} />
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </Modal>
  );
}
