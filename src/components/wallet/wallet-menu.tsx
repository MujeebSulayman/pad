"use client";

import { useEffect, useState } from "react";
import { CHAIN, type ChainId } from "@/lib/data";
import { RPC_URL } from "@/lib/env";
import { cn, shortAddr } from "@/lib/format";
import { nativeBalance } from "@/lib/rpc";
import { ArrowUpRight, ChainMark, Check, ChevronDown, Copy } from "../icons";
import { useToast } from "../toast";
import { Button, Modal } from "../ui";
import { useWallet } from "./context";

/** One Solana wallet; one EVM wallet shared by every EVM chain. */
const GROUPS: { label: string; chains: ChainId[] }[] = [
  { label: "Solana wallet", chains: ["solana"] },
  { label: "EVM wallet · Base, BNB Chain, Robinhood", chains: ["base", "bsc", "robinhood"] },
];

const explorerAddress = (chain: ChainId, address: string) =>
  `${CHAIN[chain].explorer}/${chain === "solana" ? "account" : "address"}/${address}`;

/**
 * The connected-wallet button in the header. Opens a panel with both addresses (copyable), live
 * balances per chain and explorer links; disconnecting is a separate, explicit button.
 */
export function WalletButton({ address, onDisconnect, compact }: { address: string | null; onDisconnect: () => void; compact?: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={() => setOpen(true)} className={cn("btn btn-sm btn-ghost !h-10", compact ? "!gap-1.5 !px-3" : "!gap-2 !pl-2.5")} title="Wallet" aria-haspopup="dialog">
        <span className={cn("grid place-items-center rounded-full bg-good text-[var(--accent-ink)]", compact ? "h-[18px] w-[18px]" : "h-5 w-5")}>
          <Check size={compact ? 10 : 11} strokeWidth={2.4} />
        </span>
        <span className={cn("font-mono", compact ? "text-[11.5px]" : "text-[12.5px]")}>
          {address ? shortAddr(address, compact ? 4 : 5, 4) : compact ? "No wallet" : "No wallet on this chain"}
        </span>
        {!compact && <ChevronDown size={13} className="text-mute" />}
      </button>
      <WalletPanel
        open={open}
        onClose={() => setOpen(false)}
        onDisconnect={() => {
          setOpen(false);
          onDisconnect();
        }}
      />
    </>
  );
}

function WalletPanel({ open, onClose, onDisconnect }: { open: boolean; onClose: () => void; onDisconnect: () => void }) {
  const wallet = useWallet();
  const toast = useToast();
  const [balances, setBalances] = useState<Partial<Record<ChainId, number | null>>>({});

  // Fresh balances each time the panel opens. Simulated addresses don't exist on-chain, so skip them.
  useEffect(() => {
    if (!open || wallet.mode !== "privy") return;
    let alive = true;
    setBalances({});
    for (const { chains } of GROUPS) {
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
  }, [open, wallet]);

  const copy = (value: string, label: string) => {
    navigator.clipboard?.writeText(value);
    toast({ tone: "success", title: `${label} copied`, description: value });
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Your wallets"
      description={
        wallet.mode === "privy"
          ? "Fund these addresses to launch. Each chain's fees are paid from the wallet for that chain."
          : "Demo mode: these addresses are simulated and hold no funds."
      }
      footer={
        <>
          <Button variant="ghost" size="sm" onClick={onClose}>
            Close
          </Button>
          <Button variant="secondary" size="sm" onClick={onDisconnect}>
            Disconnect
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-5">
        {GROUPS.map(({ label, chains }) => {
          const address = wallet.addressFor(chains[0]);
          return (
            <section key={label}>
              <p className="label mb-2">{label}</p>
              {address ? (
                <>
                  <button
                    onClick={() => copy(address, "Address")}
                    className="flex w-full items-center justify-between gap-3 rounded-[16px] bg-[var(--steel)] px-4 py-3 text-left font-mono text-[12.5px] shadow-[inset_0_1px_0_var(--rim)] transition-colors hover:bg-[var(--steel-2)]"
                    title="Copy address"
                  >
                    <span className="break-all">{address}</span>
                    <span className="flex shrink-0 items-center gap-1 font-sans text-[12px] text-dim">
                      <Copy size={13} />
                      Copy
                    </span>
                  </button>
                  <ul className="mt-2 flex flex-col">
                    {chains
                      .filter((c) => RPC_URL[c])
                      .map((c) => {
                        const chain = CHAIN[c];
                        const v = balances[c];
                        return (
                          <li key={c} className="flex items-center gap-2.5 border-b border-line py-2.5 last:border-b-0">
                            <span style={{ color: chain.accent }}>
                              <ChainMark chain={chain.mark} size={14} />
                            </span>
                            <span className="text-[13.5px]">{chain.shortName}</span>
                            <span className="ml-auto font-mono text-[13px] tabular-nums">
                              {wallet.mode !== "privy" ? "—" : v === undefined ? "…" : v === null ? "unavailable" : `${v.toFixed(4)} ${chain.nativeToken}`}
                            </span>
                            <a
                              href={explorerAddress(c, address)}
                              target="_blank"
                              rel="noreferrer"
                              className="grid h-7 w-7 place-items-center rounded-full text-mute transition-colors hover:bg-[var(--steel)] hover:text-fg"
                              title={`View on ${chain.shortName} explorer`}
                            >
                              <ArrowUpRight size={13} />
                            </a>
                          </li>
                        );
                      })}
                  </ul>
                </>
              ) : (
                <p className="text-[13px] text-dim">No wallet of this kind is connected.</p>
              )}
            </section>
          );
        })}
      </div>
    </Modal>
  );
}
