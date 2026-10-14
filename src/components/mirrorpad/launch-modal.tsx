"use client";

import { useEffect, useState } from "react";
import { ADAPTERS, type LegResult, type Meta } from "@/lib/adapters";
import { api, ApiError } from "@/lib/api";
import { CHAIN, type Draft, type Launch, type Launchpad, type Mirrors } from "@/lib/data";
import { cn, shortAddr } from "@/lib/format";
import { buildLegs, buildSteps, isReviewed, stepDuration, type Step } from "@/lib/launch";
import { ArrowUpRight, Alert, ChainMark, Check, Copy } from "../icons";
import { useToast } from "../toast";
import { Badge, Button, Modal, Spinner, TokenAvatar } from "../ui";
import { useWallet, type Signer } from "../wallet/context";

/** How each leg ended. */
type Outcome = { status: LegResult["status"] | "failed"; mint?: string; tx?: string; error?: string; next?: LegResult["next"] };

const explorerTx = (chain: Launchpad["chain"], tx: string) => `${CHAIN[chain].explorer}/tx/${tx}`;

/**
 * One launch run. With a real wallet each leg runs its venue adapter (pin metadata → build → sign →
 * broadcast → verify and save); with the simulated wallet the same steps tick through on timers.
 * Mount it fresh (with a new key) per run. Closing the modal hides it but the run keeps going.
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
  const { signer } = useWallet();
  // Snapshot the inputs: edits made while the run is going don't change it.
  const [legs] = useState(() => buildLegs(pad, draft, mirrors));
  const [snap] = useState(() => ({ pad, draft, signer }));
  const [steps, setSteps] = useState<Step[][]>(() => legs.map((l) => buildSteps(l.pad, l.mirror)));
  const [outcomes, setOutcomes] = useState<(Outcome | null)[]>(() => legs.map(() => null));
  const [done, setDone] = useState(false);
  const multi = legs.length > 1;

  const setStep = (leg: number, step: number, patch: Partial<Step>) =>
    setSteps((all) => all.map((s, i) => (i === leg ? s.map((x, j) => (j === step ? { ...x, ...patch } : x)) : s)));

  useEffect(() => {
    if (snap.signer) {
      void runReal(snap.signer);
      return;
    }
    return runSimulated();
    // The run is fixed at mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── Real run ─────────────────────────────────────────────── */

  async function runReal(signer: Signer) {
    const d = snap.draft;
    const call = async <T,>(path: string, body: unknown) => api<T>(path, { body, token: await signer.getAccessToken() });
    const group = multi ? crypto.randomUUID() : undefined;
    const saved: Launch[] = [];
    const results: Outcome[] = [];
    let meta: Meta | null = null;
    let unsaved = false;

    const pinMeta = async (): Promise<Meta> => {
      const r = await call<{ image: { uri: string; url: string }; metadata: { uri: string; url: string } }>("/api/metadata", {
        name: d.name,
        symbol: d.symbol,
        description: d.description,
        image: d.imageUrl,
        website: d.website,
        twitter: d.twitter,
        telegram: d.telegram,
      });
      return { imageUri: r.image.uri, imageUrl: r.image.url, metadataUri: r.metadata.uri, metadataUrl: r.metadata.url };
    };

    for (const [li, leg] of legs.entries()) {
      const ids = buildSteps(leg.pad, leg.mirror).map((s) => s.id);
      let current = -1;
      const step = (id: string, detail?: string) => {
        const at = ids.indexOf(id);
        for (let j = Math.max(current, 0); j < at; j++) setStep(li, j, { state: "done" });
        setStep(li, at, { state: "active", ...(detail && { detail }) });
        current = at;
      };

      let outcome: Outcome;
      try {
        if (leg.mirror) step("reuse");
        else {
          step("validate");
          step("upload");
        }
        meta ??= await pinMeta();
        const r = await ADAPTERS[leg.pad.id].run({ pad: leg.pad, draft: d, meta, signer, call, step });

        step("index");
        try {
          const { launch } = await call<{ launch: Launch }>("/api/launches", {
            launchpadId: leg.pad.id,
            creator: r.creator,
            status: r.status,
            mint: r.mint,
            txHash: r.tx,
            mirrorGroup: group,
            mirrorCount: multi ? legs.length : undefined,
            token: { name: d.name, symbol: d.symbol, description: d.description, imageUrl: meta.imageUri, metadataUri: meta.metadataUri },
            details: r.details,
          });
          saved.push(launch);
        } catch (e) {
          // The launch itself happened; only the feed write failed.
          unsaved = true;
          saved.push(localLaunch(leg.pad, r, meta.imageUrl, group, multi ? legs.length : undefined));
          console.error("saving launch", e);
        }
        ids.forEach((id, j) => setStep(li, j, { state: "done", hash: r.tx && (id === "submit" || id === "confirm") ? r.tx : undefined }));
        outcome = { status: r.status, mint: r.mint, tx: r.tx, next: r.next };
      } catch (e) {
        const message = e instanceof ApiError || e instanceof Error ? e.message : String(e);
        setStep(li, Math.max(current, 0), { state: "error", detail: message.slice(0, 240) });
        outcome = { status: "failed", error: message };
      }
      results.push(outcome);
      setOutcomes((all) => all.map((o, i) => (i === li ? outcome : o)));
    }

    setDone(true);
    if (saved.length) onComplete(saved);
    if (unsaved) toast({ tone: "error", title: "Launched, but not saved to the feed", description: "The database is unreachable or not configured. Your token is on-chain." });
    finishToast(results);
  }

  /* ── Simulated run (no real wallet) ──────────────────────── */

  function runSimulated() {
    const timers: ReturnType<typeof setTimeout>[] = [];
    let t = 320;
    legs.forEach((leg, li) => {
      steps[li].forEach((step, si) => {
        timers.push(setTimeout(() => setStep(li, si, { state: "active" }), t));
        t += stepDuration(step.id);
        timers.push(setTimeout(() => setStep(li, si, { state: "done", hash: step.id === "sign" ? leg.tx : undefined }), t));
        t += 140;
      });
      t += 260;
    });

    timers.push(
      setTimeout(() => {
        const d = snap.draft;
        const group = `mg-${Date.now()}`;
        const results: Outcome[] = legs.map((l) => ({ status: isReviewed(l.pad) ? "pending" : "success", mint: l.mint, tx: l.tx }));
        setOutcomes(results);
        setDone(true);
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
        finishToast(results);
      }, t + 200),
    );
    return () => timers.forEach(clearTimeout);
  }

  function localLaunch(p: Launchpad, r: LegResult, imageUrl: string, group?: string, count?: number): Launch {
    return {
      id: `${Date.now()}-${p.id}`,
      launchpadId: p.id,
      chain: p.chain,
      name: snap.draft.name,
      symbol: snap.draft.symbol,
      imageUrl,
      createdAt: Date.now(),
      status: r.status === "success" ? "success" : "pending",
      txHash: r.tx ?? "",
      mintAddress: r.mint ?? "",
      marketCapUsd: 0,
      mirrorGroup: group,
      mirrorCount: count,
    };
  }

  function finishToast(results: Outcome[]) {
    const d = snap.draft;
    const ok = results.filter((r) => r.status !== "failed").length;
    const firstTx = legs.findIndex((_, i) => results[i]?.tx);
    const action = firstTx >= 0 ? { label: "View on explorer", href: explorerTx(legs[firstTx].chain, results[firstTx].tx!) } : undefined;
    if (ok === 0) {
      toast({ tone: "error", title: `${d.symbol} launch failed`, description: results[0]?.error?.slice(0, 160) });
      return;
    }
    const anyReview = results.some((r) => r.status === "pending");
    toast({
      tone: ok < results.length ? "info" : anyReview ? "info" : "success",
      title:
        ok < results.length
          ? `${ok} of ${results.length} legs launched`
          : multi
            ? `${d.symbol} mirrored across ${legs.length} chains`
            : results[0].status === "pending"
              ? `${d.symbol} submitted for review`
              : `${d.symbol} is live`,
      description: multi ? legs.map((l) => CHAIN[l.chain].shortName).join(", ") : `${CHAIN[legs[0].chain].name} via ${legs[0].pad.name}.`,
      action,
    });
  }

  const copy = (value: string, label: string) => {
    navigator.clipboard?.writeText(value);
    toast({ tone: "success", title: `${label} copied` });
  };

  const { pad: p, draft: d } = snap;
  const failed = outcomes.filter((o) => o?.status === "failed").length;
  const firstTxLeg = legs.findIndex((_, i) => outcomes[i]?.tx);
  const explorerUrl = firstTxLeg >= 0 ? explorerTx(legs[firstTxLeg].chain, outcomes[firstTxLeg]!.tx!) : null;
  const only = outcomes[0];

  const title = done
    ? failed === legs.length
      ? "Launch failed"
      : failed > 0
        ? `${legs.length - failed} of ${legs.length} legs launched`
        : multi
          ? `Mirrored to ${legs.length} chains`
          : only?.status === "pending"
            ? "Submitted for review"
            : "Launch complete"
    : multi
      ? `Mirroring $${d.symbol}`
      : `Launching $${d.symbol}`;

  const description = done
    ? failed === legs.length
      ? "Nothing was deployed. The failing step shows why."
      : multi
        ? `${d.name} has an independent deployment on each chain that succeeded. Liquidity is not shared between them.`
        : only?.status === "pending"
          ? `${p.name} has your issuance packet. Status will flip to live once it clears review.`
          : `${d.name} is deployed on ${CHAIN[p.chain].name}.`
    : multi
      ? `Running ${legs.length} adapters — expect a wallet prompt per chain.`
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
            {explorerUrl && (
              <Button variant="primary" size="sm" onClick={() => window.open(explorerUrl, "_blank")} suffix={<ArrowUpRight size={14} />}>
                View on explorer
              </Button>
            )}
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
          const o = outcomes[li];
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
                  {o && o.status !== "failed" && (
                    <span className="pop text-good">
                      <Check size={15} strokeWidth={2.2} />
                    </span>
                  )}
                  {o?.status === "failed" && (
                    <span className="pop text-bad">
                      <Alert size={15} />
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
                      <p className={cn("mt-0.5 break-words text-[12.5px] leading-4", s.state === "error" ? "text-bad" : "text-dim")}>{s.detail}</p>
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

      {done && failed < legs.length && (
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
              <p className="text-[12.5px] text-dim">{legs.length === 1 ? `${CHAIN[legs[0].chain].name} · ${legs[0].pad.name}` : `${legs.length} independent deployments`}</p>
            </div>
          </div>
          <div className="mt-3.5 flex flex-col gap-3.5 border-t border-line pt-3.5">
            {legs.map((leg, li) => {
              const chain = CHAIN[leg.chain];
              const o = outcomes[li];
              if (!o) return null;
              const fields = [
                o.mint && { label: leg.chain === "solana" ? "Mint address" : "Contract", value: o.mint },
                o.tx && { label: "Transaction", value: o.tx },
              ].filter(Boolean) as { label: string; value: string }[];
              return (
                <div key={leg.pad.id}>
                  <p className="flex items-center gap-1.5 text-[11.5px] text-dim">
                    <span style={{ color: chain.accent }}>
                      <ChainMark chain={chain.mark} size={11} />
                    </span>
                    <span className="font-semibold text-fg">{chain.shortName}</span>· {leg.pad.name}
                    {o.status === "pending" && <span className="text-t-amber">· in review</span>}
                    {o.status === "failed" && <span className="text-bad">· failed</span>}
                  </p>
                  {o.error && <p className="mt-1 break-words text-[12px] text-bad">{o.error.slice(0, 240)}</p>}
                  {fields.length > 0 && (
                    <div className="mt-1.5 grid gap-2 sm:grid-cols-2">
                      {fields.map((x) => (
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
                  )}
                  {o.next && (
                    <a href={o.next.href} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 text-[12.5px] font-semibold text-accent hover:underline">
                      {o.next.label}
                      <ArrowUpRight size={12} />
                    </a>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </Modal>
  );
}
