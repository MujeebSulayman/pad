"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { formatUnits, parseUnits } from "viem";
import { CHAIN, PAD, type Launch } from "@/lib/data";
import { FEE_LABEL } from "@/lib/fees";
import { cn } from "@/lib/format";
import { nativeBalance } from "@/lib/rpc";
import { executeQuote, getQuote, nativeDecimals, tokenBalance, type Quote, type Side } from "@/lib/trade";
import { ArrowUpRight, ChainMark } from "../icons";
import { useToast } from "../toast";
import { Button, Modal, Spinner, TokenAvatar } from "../ui";
import { useWallet } from "../wallet/context";

/** Trims a decimal string for display: up to 6 significant decimals. */
function fmt(raw: bigint, decimals: number) {
  const s = formatUnits(raw, decimals);
  const [i, f = ""] = s.split(".");
  const keep = f.replace(/0+$/, "").slice(0, Number(i) === 0 ? 8 : 4);
  return keep ? `${Number(i).toLocaleString()}.${keep}` : Number(i).toLocaleString();
}

const SELL_PRESETS = ["25", "50", "100"];
const BUY_PRESETS: Record<string, string[]> = { SOL: ["0.1", "0.5", "1"], ETH: ["0.005", "0.01", "0.05"], BNB: ["0.01", "0.05", "0.1"] };

/** Buy and sell a launched token in-app. ShadowPad's fee is part of the quote and shown before signing. */
export function TradeModal({ launch, onClose }: { launch: Launch; onClose: () => void }) {
  const { signer, addressFor, connect } = useWallet();
  const toast = useToast();
  const chain = CHAIN[launch.chain];
  const pad = PAD[launch.launchpadId];
  const owner = addressFor(launch.chain);
  const ctx = signer && owner ? { signer, token: { chain: launch.chain, address: launch.mintAddress } } : null;

  const [side, setSide] = useState<Side>("buy");
  const [input, setInput] = useState("");
  const [native, setNative] = useState<bigint | null>(null);
  const [holding, setHolding] = useState<{ raw: bigint; decimals: number } | null>(null);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [quoting, setQuoting] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const seq = useRef(0);

  const nd = nativeDecimals(launch.chain);
  const td = holding?.decimals ?? (launch.chain === "solana" ? 6 : 18);
  const spendDecimals = side === "buy" ? nd : td;
  const receiveDecimals = side === "buy" ? td : nd;
  const spendSymbol = side === "buy" ? chain.nativeToken : launch.symbol;
  const receiveSymbol = side === "buy" ? launch.symbol : chain.nativeToken;

  const loadBalances = useCallback(() => {
    if (!owner) return;
    nativeBalance(launch.chain, owner)
      .then((v) => setNative(v === null ? null : parseUnits(v.toFixed(nd), nd)))
      .catch(() => setNative(null));
    tokenBalance(launch.chain, owner, launch.mintAddress)
      .then(setHolding)
      .catch(() => setHolding({ raw: 0n, decimals: launch.chain === "solana" ? 6 : 18 }));
  }, [owner, launch.chain, launch.mintAddress, nd]);
  useEffect(loadBalances, [loadBalances]);

  // Parse the typed amount into raw units; null when empty or invalid.
  let amount: bigint | null = null;
  try {
    amount = input && Number(input) > 0 ? parseUnits(input, spendDecimals) : null;
  } catch {
    amount = null;
  }
  const balance = side === "buy" ? native : (holding?.raw ?? null);
  const tooMuch = amount !== null && balance !== null && amount > balance;

  // Re-quote 600 ms after the amount or side settles.
  useEffect(() => {
    setQuote(null);
    setError(null);
    if (!ctx || !amount || tooMuch) return;
    const id = ++seq.current;
    setQuoting(true);
    const t = setTimeout(() => {
      getQuote(ctx, side, amount!)
        .then((q) => id === seq.current && setQuote(q))
        .catch((e: Error) => id === seq.current && setError(friendly(e.message)))
        .finally(() => id === seq.current && setQuoting(false));
    }, 600);
    return () => clearTimeout(t);
    // ctx is rebuilt each render; the inputs below are what matter.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [side, input, tooMuch, signer, owner]);

  const friendly = (msg: string) =>
    /no route|liquidity|could not find any route|NO_ROUTES/i.test(msg)
      ? `No trading route for this token yet. It may still be too new or on its launch curve${pad ? `; you can trade it on ${pad.name}` : ""}.`
      : /ZEROX_API_KEY/.test(msg)
        ? "Trading on this chain isn't configured yet."
        : msg.slice(0, 220);

  const confirm = async () => {
    if (!ctx || !quote) return;
    setBusy(true);
    setError(null);
    try {
      const tx = await executeQuote(ctx, quote);
      toast({
        tone: "success",
        title: `${side === "buy" ? "Bought" : "Sold"} $${launch.symbol}`,
        description: `${fmt(quote.receive, receiveDecimals)} ${receiveSymbol} received.`,
        action: { label: "View transaction", href: `${chain.explorer}/tx/${tx}` },
      });
      setInput("");
      setQuote(null);
      loadBalances();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(/rejected|denied|cancel/i.test(msg) ? "You cancelled the signature." : friendly(msg));
    } finally {
      setBusy(false);
    }
  };

  const setPercent = (pct: string) => {
    if (!holding) return;
    setInput(formatUnits((holding.raw * BigInt(pct)) / 100n, holding.decimals));
  };

  return (
    <Modal open onClose={onClose} title={`Trade $${launch.symbol}`} description={`${launch.name} on ${chain.name}${pad ? ` · launched on ${pad.name}` : ""}`}>
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-3 rounded-[18px] bg-[var(--steel)] p-3 shadow-[inset_0_1px_0_var(--rim)]">
          <TokenAvatar imageUrl={launch.imageUrl} symbol={launch.symbol} className="h-11 w-11 rounded-[13px] text-[12px]" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[14.5px] font-semibold">
              {launch.name} <span className="font-mono text-[12px] font-normal text-mute">${launch.symbol}</span>
            </p>
            <p className="flex items-center gap-1.5 text-[12px] text-dim">
              <span style={{ color: chain.accent }}>
                <ChainMark chain={chain.mark} size={11} />
              </span>
              {chain.shortName}
              <a href={`${chain.explorer}/token/${launch.mintAddress}`} target="_blank" rel="noreferrer" className="ml-1 inline-flex items-center gap-0.5 hover:text-fg">
                explorer <ArrowUpRight size={11} />
              </a>
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-1 rounded-[14px] bg-[var(--field-bg)] p-1 shadow-[var(--field-in)]" role="radiogroup" aria-label="Side">
          {(["buy", "sell"] as const).map((s) => (
            <button
              key={s}
              role="radio"
              aria-checked={side === s}
              onClick={() => {
                setSide(s);
                setInput("");
              }}
              className={cn(
                "h-9 rounded-[10px] text-[13.5px] font-semibold capitalize transition-colors",
                side === s ? (s === "buy" ? "bg-good text-[var(--accent-ink)]" : "bg-bad text-white") : "text-dim hover:text-fg",
              )}
            >
              {s}
            </button>
          ))}
        </div>

        <div>
          <div className="mb-1.5 flex items-baseline justify-between text-[12px] text-dim">
            <span>{side === "buy" ? "You pay" : "You sell"}</span>
            <span className="font-mono">
              Balance: {balance === null ? "…" : `${fmt(balance, spendDecimals)} ${spendSymbol}`}
            </span>
          </div>
          <div className={cn("input-wrap", tooMuch && "is-invalid")}>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value.replace(/[^0-9.]/g, ""))}
              placeholder="0.0"
              inputMode="decimal"
              className="font-mono"
              aria-label={`Amount in ${spendSymbol}`}
            />
            <span>{spendSymbol}</span>
          </div>
          <div className="mt-2 flex gap-1.5">
            {(side === "buy" ? (BUY_PRESETS[chain.nativeToken] ?? []) : SELL_PRESETS).map((p) => (
              <button
                key={p}
                onClick={() => (side === "buy" ? setInput(p) : setPercent(p))}
                className="h-7 rounded-full bg-[var(--steel)] px-3 font-mono text-[12px] text-dim transition-colors hover:bg-[var(--steel-2)] hover:text-fg"
              >
                {side === "buy" ? `${p} ${chain.nativeToken}` : p === "100" ? "Max" : `${p}%`}
              </button>
            ))}
          </div>
          {tooMuch && <p className="mt-1.5 text-[12px] text-bad">More than your balance.</p>}
        </div>

        <div className="rounded-[16px] bg-[var(--field-bg)] p-3.5 text-[13px] shadow-[var(--field-in)]">
          {quoting ? (
            <p className="flex items-center gap-2 text-dim">
              <Spinner size={12} /> Getting the best price…
            </p>
          ) : quote ? (
            <dl className="flex flex-col gap-1.5">
              <div className="flex justify-between">
                <dt className="text-dim">You receive</dt>
                <dd className="font-mono font-semibold">
                  ≈ {fmt(quote.receive, receiveDecimals)} {receiveSymbol}
                </dd>
              </div>
              <div className="flex justify-between text-[12px]">
                <dt className="text-mute">Minimum (after slippage)</dt>
                <dd className="font-mono text-dim">
                  {fmt(quote.receiveMin, receiveDecimals)} {receiveSymbol}
                </dd>
              </div>
              {quote.fee > 0n && (
                <div className="flex justify-between text-[12px]">
                  <dt className="text-mute">ShadowPad fee ({FEE_LABEL})</dt>
                  <dd className="font-mono text-dim">
                    {fmt(quote.fee, nd)} {chain.nativeToken}
                  </dd>
                </div>
              )}
            </dl>
          ) : (
            <p className="text-dim">{error ?? "Enter an amount to see a quote."}</p>
          )}
          {error && quote && <p className="mt-2 text-[12px] text-bad">{error}</p>}
        </div>

        {!ctx ? (
          <Button variant="accent" full onClick={connect}>
            Connect a {launch.chain === "solana" ? "Solana" : "EVM"} wallet to trade
          </Button>
        ) : (
          <Button variant="accent" full loading={busy} disabled={!quote || busy || quoting} onClick={confirm}>
            {busy ? "Confirm in your wallet…" : side === "buy" ? `Buy $${launch.symbol}` : `Sell $${launch.symbol}`}
          </Button>
        )}
        <p className="text-center text-[11.5px] leading-4 text-mute">
          Trades route through {launch.chain === "solana" ? "Jupiter" : "0x"} at the best available price. Prices on new tokens move fast; the minimum protects you if they move against you.
        </p>
      </div>
    </Modal>
  );
}
