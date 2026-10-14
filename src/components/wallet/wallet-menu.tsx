"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { CHAIN, type ChainId } from "@/lib/data";
import { RPC_URL } from "@/lib/env";
import { cn, shortAddr } from "@/lib/format";
import { nativeBalance } from "@/lib/rpc";
import { ArrowUpRight, ChainMark, Check, ChevronDown, Copy, X } from "../icons";
import { useToast } from "../toast";
import { useWallet } from "./context";

/** One Solana wallet; one EVM wallet shared by every EVM chain. */
const WALLETS: { id: "solana" | "evm"; label: string; chains: ChainId[] }[] = [
  { id: "solana", label: "Solana", chains: ["solana"] },
  { id: "evm", label: "EVM", chains: ["base", "bsc", "robinhood"] },
];

const explorerAddress = (chain: ChainId, address: string) => `${CHAIN[chain].explorer}/${chain === "solana" ? "account" : "address"}/${address}`;

type Anchor = { top: number; right: number } | "sheet";

/**
 * The connected-wallet button in the header. Opens a small menu with both wallets: address (copy +
 * explorer) and live balances per chain. Disconnecting is its own button inside the menu.
 */
export function WalletButton({ address, onDisconnect, compact }: { address: string | null; onDisconnect: () => void; compact?: boolean }) {
  const button = useRef<HTMLButtonElement>(null);
  const [anchor, setAnchor] = useState<Anchor | null>(null);

  const toggle = () => {
    if (anchor) return setAnchor(null);
    const r = button.current?.getBoundingClientRect();
    // Phones get a bottom sheet; wider screens a dropdown under the button.
    setAnchor(!r || window.innerWidth < 640 ? "sheet" : { top: r.bottom + 10, right: Math.max(16, window.innerWidth - r.right) });
  };

  return (
    <>
      <button
        ref={button}
        onClick={toggle}
        className={cn("btn btn-sm btn-ghost !h-10", compact ? "!gap-1.5 !px-3" : "!gap-2 !pl-2.5")}
        aria-haspopup="menu"
        aria-expanded={!!anchor}
      >
        <span className={cn("grid place-items-center rounded-full bg-good text-[var(--accent-ink)]", compact ? "h-[18px] w-[18px]" : "h-5 w-5")}>
          <Check size={compact ? 10 : 11} strokeWidth={2.4} />
        </span>
        <span className={cn("font-mono", compact ? "text-[11.5px]" : "text-[12.5px]")}>
          {address ? shortAddr(address, compact ? 4 : 5, 4) : compact ? "No wallet" : "No wallet on this chain"}
        </span>
        <ChevronDown size={13} className={cn("text-mute transition-transform", anchor && "rotate-180")} />
      </button>
      {anchor &&
        // Portalled to <body>: the glass header is a containing block that would clip a fixed menu.
        createPortal(
          <WalletMenu
            anchor={anchor}
            ignore={button}
            onClose={() => setAnchor(null)}
            onDisconnect={() => {
              setAnchor(null);
              onDisconnect();
            }}
          />,
          document.body,
        )}
    </>
  );
}

function WalletMenu({ anchor, ignore, onClose, onDisconnect }: { anchor: Anchor; ignore: React.RefObject<HTMLElement | null>; onClose: () => void; onDisconnect: () => void }) {
  const wallet = useWallet();
  const toast = useToast();
  const panel = useRef<HTMLDivElement>(null);
  const [balances, setBalances] = useState<Partial<Record<ChainId, number | null>>>({});
  const [copied, setCopied] = useState<string | null>(null);
  const live = wallet.mode === "privy";

  // Close on Escape, on a click outside, and when the page scrolls or resizes under a dropdown.
  useLayoutEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    const onDown = (e: PointerEvent) => {
      const t = e.target as Node;
      if (!panel.current?.contains(t) && !ignore.current?.contains(t)) onClose();
    };
    const onMove = () => anchor !== "sheet" && onClose();
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onDown);
    window.addEventListener("resize", onMove);
    window.addEventListener("scroll", onMove, { passive: true });
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onDown);
      window.removeEventListener("resize", onMove);
      window.removeEventListener("scroll", onMove);
    };
  }, [anchor, ignore, onClose]);

  // Fresh balances each time the menu opens. Simulated addresses don't exist on-chain, so skip them.
  useEffect(() => {
    if (!live) return;
    let alive = true;
    for (const { chains } of WALLETS) {
      for (const chain of chains) {
        const address = wallet.addressFor(chain);
        if (!address || !RPC_URL[chain]) continue;
        nativeBalance(chain, address)
          .then((v) => alive && setBalances((b) => ({ ...b, [chain]: v })))
          .catch(() => alive && setBalances((b) => ({ ...b, [chain]: null })));
      }
    }
    return () => {
      alive = false;
    };
  }, [live, wallet]);

  const copy = (address: string, label: string) => {
    navigator.clipboard?.writeText(address);
    setCopied(address);
    setTimeout(() => setCopied((c) => (c === address ? null : c)), 1600);
    toast({ tone: "success", title: `${label} address copied` });
  };

  const sheet = anchor === "sheet";
  return (
    <>
      {sheet && <div className="fade-in fixed inset-0 z-[95] bg-black/45 backdrop-blur-[4px]" onClick={onClose} aria-hidden />}
      <div
        ref={panel}
        role="menu"
        aria-label="Wallet"
        className={cn(
          "sheet fixed z-[96] flex flex-col gap-3 p-3",
          sheet ? "sheet-in inset-x-0 bottom-0 rounded-t-[26px] pb-[calc(12px+env(safe-area-inset-bottom))]" : "scale-in w-[340px] rounded-[22px]",
        )}
        style={sheet ? undefined : { top: anchor.top, right: anchor.right, transformOrigin: "top right" }}
      >
        <div className="flex items-center justify-between px-1.5 pt-0.5">
          <p className="text-[14px] font-semibold">Wallet</p>
          <div className="flex items-center gap-2">
            {!live && <span className="pill !h-6 !text-[11px]">Demo</span>}
            <button onClick={onClose} aria-label="Close" className="grid h-7 w-7 place-items-center rounded-full text-mute transition-colors hover:bg-[var(--steel)] hover:text-fg">
              <X size={13} />
            </button>
          </div>
        </div>

        {WALLETS.map(({ id, label, chains }) => {
          const address = wallet.addressFor(chains[0]);
          const rows = chains.filter((c) => RPC_URL[c]);
          return (
            <section key={id} className="rounded-[18px] bg-[var(--steel)] p-3 shadow-[inset_0_1px_0_var(--rim)]">
              <div className="flex items-center gap-2">
                <span className="flex -space-x-1">
                  {chains.map((c) => (
                    <span key={c} className="grid h-6 w-6 place-items-center rounded-full bg-[var(--knob)] shadow-[var(--edge-sm)]" style={{ color: CHAIN[c].accent }}>
                      <ChainMark chain={CHAIN[c].mark} size={12} />
                    </span>
                  ))}
                </span>
                <span className="text-[13px] font-semibold">{label}</span>
                {address && (
                  <span className="ml-auto flex items-center gap-0.5">
                    <span className="mr-1 font-mono text-[12.5px] text-dim" title={address}>
                      {shortAddr(address, 5, 5)}
                    </span>
                    <button
                      onClick={() => copy(address, label)}
                      aria-label={`Copy ${label} address`}
                      title="Copy address"
                      className="grid h-7 w-7 place-items-center rounded-full text-mute transition-colors hover:bg-[var(--steel-2)] hover:text-fg"
                    >
                      {copied === address ? <Check size={13} strokeWidth={2.2} className="text-good" /> : <Copy size={13} />}
                    </button>
                    <a
                      href={explorerAddress(chains[0], address)}
                      target="_blank"
                      rel="noreferrer"
                      aria-label="View on explorer"
                      title="View on explorer"
                      className="grid h-7 w-7 place-items-center rounded-full text-mute transition-colors hover:bg-[var(--steel-2)] hover:text-fg"
                    >
                      <ArrowUpRight size={13} />
                    </a>
                  </span>
                )}
              </div>

              {!address ? (
                <p className="mt-2 text-[12.5px] text-dim">No {label} wallet connected.</p>
              ) : (
                <div className={cn("mt-2.5 grid gap-1.5", rows.length > 1 && "grid-cols-3")}>
                  {rows.map((c) => {
                    const v = balances[c];
                    return (
                      <div key={c} className="rounded-[12px] bg-[var(--field-bg)] px-2.5 py-2 shadow-[var(--field-in)]">
                        <p className="text-[10.5px] uppercase tracking-[0.08em] text-mute">{CHAIN[c].shortName}</p>
                        <p className="mt-0.5 truncate font-mono text-[12.5px] tabular-nums">
                          {!live ? "—" : v === undefined ? "…" : v === null ? "n/a" : v.toFixed(4)}
                          <span className="ml-1 text-[10.5px] text-mute">{CHAIN[c].nativeToken}</span>
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          );
        })}

        <button
          onClick={onDisconnect}
          role="menuitem"
          className="h-10 rounded-[14px] text-[13px] font-semibold text-bad transition-colors hover:bg-[color-mix(in_srgb,var(--bad)_12%,transparent)]"
        >
          Disconnect
        </button>
      </div>
    </>
  );
}
